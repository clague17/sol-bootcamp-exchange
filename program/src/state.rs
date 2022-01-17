use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;
use std::mem::size_of;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ExchangeBooth {
    pub admin: Pubkey,
    pub vaultA: Pubkey,
    pub vaultB: Pubkey,
    pub oracle: Pubkey, // Then we're gonna read that oracle price in
    pub fee: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ExchangeRate {
    pub a_to_b: f64,
    pub b_to_a: f64
}