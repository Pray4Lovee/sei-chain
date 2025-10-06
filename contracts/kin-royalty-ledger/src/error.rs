use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("unauthorised")]
    Unauthorized {},

    #[error("royalty record not found")]
    NotFound {},

    #[error("amount must be greater than zero")]
    ZeroAmount {},

    #[error("insufficient accrued royalties")]
    InsufficientFunds {},

    #[error("{0}")]
    Std(#[from] StdError),

    #[error("payload serialisation error")]
    PayloadSerialisation {},
}
