use cosmwasm_schema::cw_serde;
use cosmwasm_std::Uint128;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[cw_serde]
pub struct InstantiateMsg {
    pub admin: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    RecordRoyalty {
        user: String,
        evm_address: String,
        amount: Uint128,
    },
    PrepareSettlement {
        user: String,
        amount: Option<Uint128>,
    },
    UpdateAdmin {
        admin: String,
    },
}

#[cw_serde]
pub enum QueryMsg {
    Config {},
    Royalty { user: String },
}

#[cw_serde]
pub struct ConfigResponse {
    pub admin: String,
}

#[cw_serde]
pub struct RoyaltyResponse {
    pub user: String,
    pub evm_address: String,
    pub accrued: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct SettlementPayload {
    pub evm_recipient: String,
    pub amount: String,
    pub user_id: String,
}
