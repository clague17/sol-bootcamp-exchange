use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;
use std::mem::size_of;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ExchangeBooth {
    pub admin: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub oracle: Pubkey, // Then we're gonna read that oracle price in
    pub fee: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Oracle {
    pub token_amount1: u64,
    pub token_amount2: u64
}