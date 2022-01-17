use solana_program::{
    account_info::{next_account_info, AccountInfo},
    system_instruction,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_program::ID as SYSTEM_PROGRAM_ID,
    sysvar::{rent::Rent, Sysvar},
    program::{invoke_signed},
};
use crate::{
    error::ExchangeBoothError,
    state::ExchangeBooth,
};

use borsh::{BorshDeserialize, BorshSerialize};


pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    // ???
) -> ProgramResult {

    // All we have to do is token transfer from vault a and vault b over to the admin
    // Close the vault a account and reclaim the rent back to owner
    // Close the vault b account and reclaim the rent back to owner
    Ok(())
}