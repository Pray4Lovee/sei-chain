use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Config {
    pub admin: Addr,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct RoyaltyEntry {
    pub evm_address: String,
    pub accrued: Uint128,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const ROYALTIES: Map<&Addr, RoyaltyEntry> = Map::new("royalties");
