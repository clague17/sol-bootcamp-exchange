use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;
use std::mem::size_of;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ExchangeBooth {
    pub admin: u64,
    pub vaultA: u64,
    pub vaultB: u64,
    pub oracle: u64, // Then we're gonna read that oracle price in
    pub mintA: u64,
    pub mintB: u64,
    pub fee: u8,
}
