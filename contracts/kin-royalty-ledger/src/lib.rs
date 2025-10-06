use cosmwasm_schema::cw_serde;
use cosmwasm_std::{
    attr, entry_point, to_json_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo, Order,
    Response, StdResult, Uint128,
};
use cw2::set_contract_version;
use cw_storage_plus::{Bound, Map};
use thiserror::Error;

const MAX_LIMIT: u32 = 50;
const CONTRACT_NAME: &str = "kin-royalty-ledger";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    RecordRoyalty {
        user: String,
        evm_address: String,
        amount: Uint128,
    },
    BurnRoyalty {
        user: String,
        amount: Option<Uint128>,
    },
}

#[cw_serde]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    Royalty {
        user: String,
    },
    AllRoyalties {
        start_after: Option<String>,
        limit: Option<u32>,
    },
}

#[cw_serde]
pub struct RoyaltyAccount {
    pub evm_address: String,
    pub accrued_amount: Uint128,
    pub total_burned: Uint128,
}

#[cw_serde]
pub struct RoyaltyAccountResponse {
    pub user: String,
    pub evm_address: String,
    pub accrued_amount: Uint128,
    pub total_burned: Uint128,
}

#[cw_serde]
pub struct RoyaltyAccountListResponse {
    pub accounts: Vec<RoyaltyAccountResponse>,
}

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] cosmwasm_std::StdError),
    #[error("amount must be greater than zero")]
    InvalidAmount,
    #[error("royalty account not found")]
    NotFound,
    #[error("insufficient accrued royalty to burn")]
    InsufficientAccrued,
}

#[cw_serde]
struct SettlementPayload<'a> {
    evm_recipient: &'a str,
    amount: &'a str,
    user_id: &'a str,
}

const ROYALTIES: Map<&Addr, RoyaltyAccount> = Map::new("royalties");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> StdResult<Response> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new())
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::RecordRoyalty {
            user,
            evm_address,
            amount,
        } => record_royalty(deps, info, user, evm_address, amount),
        ExecuteMsg::BurnRoyalty { user, amount } => burn_royalty(deps, env, info, user, amount),
    }
}

fn record_royalty(
    deps: DepsMut,
    _info: MessageInfo,
    user: String,
    evm_address: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    if amount.is_zero() {
        return Err(ContractError::InvalidAmount);
    }

    let user_addr = deps.api.addr_validate(&user)?;
    let normalized_evm = evm_address.to_lowercase();

    let updated = ROYALTIES.update(deps.storage, &user_addr, |existing| -> StdResult<_> {
        let mut account = existing.unwrap_or(RoyaltyAccount {
            evm_address: normalized_evm.clone(),
            accrued_amount: Uint128::zero(),
            total_burned: Uint128::zero(),
        });

        account.evm_address = normalized_evm.clone();
        account.accrued_amount = account.accrued_amount.checked_add(amount)?;
        Ok(account)
    })?;

    Ok(Response::new().add_attributes([
        attr("action", "record_royalty"),
        attr("user", user_addr.as_str()),
        attr("evm_recipient", &updated.evm_address),
        attr("amount", amount.to_string()),
        attr("accrued", updated.accrued_amount.to_string()),
    ]))
}

fn burn_royalty(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    user: String,
    amount: Option<Uint128>,
) -> Result<Response, ContractError> {
    let user_addr = deps.api.addr_validate(&user)?;
    let mut account = ROYALTIES
        .may_load(deps.storage, &user_addr)?
        .ok_or(ContractError::NotFound)?;

    let burn_amount = amount.unwrap_or(account.accrued_amount);
    if burn_amount.is_zero() {
        return Err(ContractError::InvalidAmount);
    }
    if burn_amount > account.accrued_amount {
        return Err(ContractError::InsufficientAccrued);
    }

    account.accrued_amount = account.accrued_amount.checked_sub(burn_amount)?;
    account.total_burned = account.total_burned.checked_add(burn_amount)?;
    let payload = SettlementPayload {
        evm_recipient: &account.evm_address,
        amount: &burn_amount.to_string(),
        user_id: user_addr.as_str(),
    };
    let payload_bytes = serde_json::to_vec(&payload)?;
    let payload_hex = hex::encode(payload_bytes);

    ROYALTIES.save(deps.storage, &user_addr, &account)?;

    Ok(Response::new().add_attributes([
        attr("action", "burn_royalty"),
        attr("user", user_addr.as_str()),
        attr("evm_recipient", &payload.evm_recipient),
        attr("amount", burn_amount.to_string()),
        attr("remaining", account.accrued_amount.to_string()),
        attr("payload_hex", payload_hex),
        attr("timestamp", env.block.time.seconds().to_string()),
    ]))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Royalty { user } => to_json_binary(&query_royalty(deps, user)?),
        QueryMsg::AllRoyalties { start_after, limit } => {
            to_json_binary(&query_all_royalties(deps, start_after, limit)?)
        }
    }
}

fn query_royalty(deps: Deps, user: String) -> StdResult<RoyaltyAccountResponse> {
    let addr = deps.api.addr_validate(&user)?;
    let account = ROYALTIES.load(deps.storage, &addr)?;
    Ok(RoyaltyAccountResponse {
        user,
        evm_address: account.evm_address,
        accrued_amount: account.accrued_amount,
        total_burned: account.total_burned,
    })
}

fn query_all_royalties(
    deps: Deps,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<RoyaltyAccountListResponse> {
    let limit = limit.unwrap_or(MAX_LIMIT).min(MAX_LIMIT) as usize;
    let start_addr = match start_after {
        Some(addr) => Some(deps.api.addr_validate(&addr)?),
        None => None,
    };
    let start = start_addr.as_ref().map(|addr| Bound::exclusive(addr));

    let accounts = ROYALTIES
        .range(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .map(|item| {
            let (addr, account) = item?;
            Ok(RoyaltyAccountResponse {
                user: addr.into_string(),
                evm_address: account.evm_address,
                accrued_amount: account.accrued_amount,
                total_burned: account.total_burned,
            })
        })
        .collect::<StdResult<Vec<_>>>()?;

    Ok(RoyaltyAccountListResponse { accounts })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};

    #[test]
    fn record_and_query() {
        let mut deps = mock_dependencies();
        instantiate(
            deps.as_mut(),
            mock_env(),
            mock_info("creator", &[]),
            InstantiateMsg {},
        )
        .unwrap();

        let response = record_royalty(
            deps.as_mut(),
            mock_info("collector", &[]),
            "sei1user".to_string(),
            "0xABCDEF".to_string(),
            Uint128::new(1_000_000),
        )
        .unwrap();

        assert_eq!(response.attributes[0], attr("action", "record_royalty"));

        let result = query_royalty(deps.as_ref(), "sei1user".to_string()).unwrap();
        assert_eq!(result.user, "sei1user");
        assert_eq!(result.evm_address, "0xabcdef");
        assert_eq!(result.accrued_amount, Uint128::new(1_000_000));
    }

    #[test]
    fn burn_updates_account_and_payload() {
        let mut deps = mock_dependencies();
        instantiate(
            deps.as_mut(),
            mock_env(),
            mock_info("creator", &[]),
            InstantiateMsg {},
        )
        .unwrap();

        record_royalty(
            deps.as_mut(),
            mock_info("collector", &[]),
            "sei1burn".to_string(),
            "0xUSER".to_string(),
            Uint128::new(2_000_000),
        )
        .unwrap();

        let res = burn_royalty(
            deps.as_mut(),
            mock_env(),
            mock_info("anyone", &[]),
            "sei1burn".to_string(),
            Some(Uint128::new(500_000)),
        )
        .unwrap();

        assert_eq!(
            res.attributes
                .iter()
                .find(|a| a.key == "amount")
                .unwrap()
                .value,
            "500000"
        );
        let payload_hex = res
            .attributes
            .iter()
            .find(|a| a.key == "payload_hex")
            .unwrap();
        assert!(payload_hex.value.contains("7b"));

        let account = query_royalty(deps.as_ref(), "sei1burn".to_string()).unwrap();
        assert_eq!(account.accrued_amount, Uint128::new(1_500_000));
        assert_eq!(account.total_burned, Uint128::new(500_000));
    }

    #[test]
    fn cannot_burn_more_than_accrued() {
        let mut deps = mock_dependencies();
        instantiate(
            deps.as_mut(),
            mock_env(),
            mock_info("creator", &[]),
            InstantiateMsg {},
        )
        .unwrap();

        record_royalty(
            deps.as_mut(),
            mock_info("collector", &[]),
            "sei1limit".to_string(),
            "0xUSER".to_string(),
            Uint128::new(1),
        )
        .unwrap();

        let err = burn_royalty(
            deps.as_mut(),
            mock_env(),
            mock_info("anyone", &[]),
            "sei1limit".to_string(),
            Some(Uint128::new(2)),
        )
        .unwrap_err();

        assert_eq!(err, ContractError::InsufficientAccrued);
    }

    #[test]
    fn iterate_accounts() {
        let mut deps = mock_dependencies();
        instantiate(
            deps.as_mut(),
            mock_env(),
            mock_info("creator", &[]),
            InstantiateMsg {},
        )
        .unwrap();

        for idx in 0..3u8 {
            let user = format!("sei1user{}", idx);
            record_royalty(
                deps.as_mut(),
                mock_info("collector", &[]),
                user.clone(),
                format!("0xADDR{}", idx),
                Uint128::new(100),
            )
            .unwrap();
        }

        let list = query_all_royalties(deps.as_ref(), None, Some(2)).unwrap();
        assert_eq!(list.accounts.len(), 2);
        assert_eq!(list.accounts[0].user, "sei1user0");

        let start = list.accounts.last().map(|item| item.user.clone()).unwrap();
        let list_next = query_all_royalties(deps.as_ref(), Some(start), Some(2)).unwrap();
        assert_eq!(list_next.accounts.len(), 1);
        assert_eq!(list_next.accounts[0].user, "sei1user2");
    }
}
