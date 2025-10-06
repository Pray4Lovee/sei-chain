use base64::{engine::general_purpose, Engine as _};
use cosmwasm_schema::write_api;
use cosmwasm_std::{
    attr, entry_point, to_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo, Response,
    StdResult, Uint128,
};
use cw2::set_contract_version;

mod error;
mod msg;
mod state;

use error::ContractError;
use msg::{
    ConfigResponse, ExecuteMsg, InstantiateMsg, QueryMsg, RoyaltyResponse, SettlementPayload,
};
use state::{Config, RoyaltyEntry, CONFIG, ROYALTIES};

const CONTRACT_NAME: &str = "crates.io:kin-royalty-ledger";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let admin = msg
        .admin
        .map(|addr| deps.api.addr_validate(&addr))
        .transpose()?
        .unwrap_or(info.sender.clone());

    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    CONFIG.save(
        deps.storage,
        &Config {
            admin: admin.clone(),
        },
    )?;

    Ok(Response::new().add_attributes(vec![attr("action", "instantiate"), attr("admin", admin)]))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::RecordRoyalty {
            user,
            evm_address,
            amount,
        } => execute_record_royalty(deps, info, user, evm_address, amount),
        ExecuteMsg::PrepareSettlement { user, amount } => {
            execute_prepare_settlement(deps, info, user, amount)
        }
        ExecuteMsg::UpdateAdmin { admin } => execute_update_admin(deps, info, admin),
    }
}

fn ensure_admin(deps: &DepsMut, sender: &Addr) -> Result<(), ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if config.admin != *sender {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}

fn execute_record_royalty(
    deps: DepsMut,
    info: MessageInfo,
    user: String,
    evm_address: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    ensure_admin(&deps, &info.sender)?;
    if amount.is_zero() {
        return Err(ContractError::ZeroAmount {});
    }

    let user_addr = deps.api.addr_validate(&user)?;

    let mut entry = ROYALTIES
        .may_load(deps.storage, &user_addr)?
        .unwrap_or(RoyaltyEntry {
            evm_address: evm_address.clone(),
            accrued: Uint128::zero(),
        });

    if entry.evm_address != evm_address {
        entry.evm_address = evm_address.clone();
    }
    entry.accrued += amount;

    ROYALTIES.save(deps.storage, &user_addr, &entry)?;

    Ok(Response::new().add_attributes(vec![
        attr("action", "record_royalty"),
        attr("user", user_addr),
        attr("evm_recipient", entry.evm_address),
        attr("amount", amount),
        attr("accrued", entry.accrued),
    ]))
}

fn execute_prepare_settlement(
    deps: DepsMut,
    info: MessageInfo,
    user: String,
    amount: Option<Uint128>,
) -> Result<Response, ContractError> {
    ensure_admin(&deps, &info.sender)?;

    let user_addr = deps.api.addr_validate(&user)?;
    let mut entry = ROYALTIES
        .may_load(deps.storage, &user_addr)?
        .ok_or(ContractError::NotFound {})?;

    let settle_amount = amount.unwrap_or(entry.accrued);
    if settle_amount.is_zero() {
        return Err(ContractError::ZeroAmount {});
    }
    if settle_amount > entry.accrued {
        return Err(ContractError::InsufficientFunds {});
    }

    entry.accrued -= settle_amount;
    if entry.accrued.is_zero() {
        ROYALTIES.remove(deps.storage, &user_addr);
    } else {
        ROYALTIES.save(deps.storage, &user_addr, &entry)?;
    }

    let payload = SettlementPayload {
        evm_recipient: entry.evm_address.clone(),
        amount: settle_amount.to_string(),
        user_id: user_addr.to_string(),
    };

    let json_payload =
        serde_json::to_vec(&payload).map_err(|_| ContractError::PayloadSerialisation {})?;
    let payload_hex = hex::encode(&json_payload);
    let payload_base64 = general_purpose::STANDARD.encode(&json_payload);

    Ok(Response::new().add_attributes(vec![
        attr("action", "prepare_settlement"),
        attr("user", user_addr),
        attr("evm_recipient", payload.evm_recipient),
        attr("amount", settle_amount),
        attr("remaining", entry.accrued),
        attr("payload_hex", payload_hex),
        attr("payload_base64", payload_base64),
    ]))
}

fn execute_update_admin(
    deps: DepsMut,
    info: MessageInfo,
    admin: String,
) -> Result<Response, ContractError> {
    ensure_admin(&deps, &info.sender)?;
    let new_admin = deps.api.addr_validate(&admin)?;
    CONFIG.save(
        deps.storage,
        &Config {
            admin: new_admin.clone(),
        },
    )?;
    Ok(Response::new().add_attributes(vec![
        attr("action", "update_admin"),
        attr("admin", new_admin),
    ]))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_binary(&query_config(deps)?),
        QueryMsg::Royalty { user } => to_binary(&query_royalty(deps, user)?),
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let cfg = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        admin: cfg.admin.to_string(),
    })
}

fn query_royalty(deps: Deps, user: String) -> StdResult<RoyaltyResponse> {
    let addr = deps.api.addr_validate(&user)?;
    let entry = ROYALTIES.load(deps.storage, &addr)?;
    Ok(RoyaltyResponse {
        user,
        evm_address: entry.evm_address,
        accrued: entry.accrued,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};

    #[test]
    fn record_and_prepare_settlement() {
        let mut deps = mock_dependencies();

        let info = mock_info("admin", &[]);
        instantiate(
            deps.as_mut(),
            mock_env(),
            info.clone(),
            InstantiateMsg { admin: None },
        )
        .unwrap();

        execute(
            deps.as_mut(),
            mock_env(),
            info.clone(),
            ExecuteMsg::RecordRoyalty {
                user: "sei1user".to_string(),
                evm_address: "0xabc".to_string(),
                amount: Uint128::new(1_000u128),
            },
        )
        .unwrap();

        let res = execute(
            deps.as_mut(),
            mock_env(),
            info.clone(),
            ExecuteMsg::PrepareSettlement {
                user: "sei1user".to_string(),
                amount: None,
            },
        )
        .unwrap();

        let attrs = res.attributes;
        assert_eq!(
            attrs.iter().find(|a| a.key == "amount").unwrap().value,
            "1000"
        );
        assert_eq!(
            attrs.iter().find(|a| a.key == "remaining").unwrap().value,
            "0"
        );
        assert!(attrs.iter().any(|a| a.key == "payload_hex"));
        assert!(attrs.iter().any(|a| a.key == "payload_base64"));

        // Ensure ledger entry removed
        let query_err = query(
            deps.as_ref(),
            mock_env(),
            QueryMsg::Royalty {
                user: "sei1user".to_string(),
            },
        )
        .unwrap_err();
        assert!(query_err.to_string().contains("not found"));
    }

    #[test]
    fn prepare_settlement_partial_amount() {
        let mut deps = mock_dependencies();

        let info = mock_info("admin", &[]);
        instantiate(
            deps.as_mut(),
            mock_env(),
            info.clone(),
            InstantiateMsg { admin: None },
        )
        .unwrap();

        execute(
            deps.as_mut(),
            mock_env(),
            info.clone(),
            ExecuteMsg::RecordRoyalty {
                user: "sei1user".to_string(),
                evm_address: "0xabc".to_string(),
                amount: Uint128::new(2_000u128),
            },
        )
        .unwrap();

        execute(
            deps.as_mut(),
            mock_env(),
            info.clone(),
            ExecuteMsg::RecordRoyalty {
                user: "sei1user".to_string(),
                evm_address: "0xabc".to_string(),
                amount: Uint128::new(500u128),
            },
        )
        .unwrap();

        let res = execute(
            deps.as_mut(),
            mock_env(),
            info.clone(),
            ExecuteMsg::PrepareSettlement {
                user: "sei1user".to_string(),
                amount: Some(Uint128::new(1_500u128)),
            },
        )
        .unwrap();

        let remaining = res
            .attributes
            .iter()
            .find(|a| a.key == "remaining")
            .unwrap()
            .value
            .clone();
        assert_eq!(remaining, "1000");

        let royalty = query(
            deps.as_ref(),
            mock_env(),
            QueryMsg::Royalty {
                user: "sei1user".to_string(),
            },
        )
        .unwrap();
        let RoyaltyResponse { accrued, .. } = cosmwasm_std::from_binary(&royalty).unwrap();
        assert_eq!(accrued, Uint128::new(1_000u128));
    }

    #[test]
    fn non_admin_cannot_modify() {
        let mut deps = mock_dependencies();

        instantiate(
            deps.as_mut(),
            mock_env(),
            mock_info("admin", &[]),
            InstantiateMsg { admin: None },
        )
        .unwrap();

        let err = execute(
            deps.as_mut(),
            mock_env(),
            mock_info("intruder", &[]),
            ExecuteMsg::RecordRoyalty {
                user: "sei1user".to_string(),
                evm_address: "0xabc".to_string(),
                amount: Uint128::new(100u128),
            },
        )
        .unwrap_err();

        assert_eq!(err, ContractError::Unauthorized {});
    }
}

#[allow(dead_code)]
pub fn export_schema() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        query: QueryMsg,
    }
}
