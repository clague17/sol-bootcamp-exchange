use borsh::{BorshDeserialize, BorshSerialize};

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
use spl_token::{
    solana_program::program_pack::Pack,
    state::{Account as SplTokenAccount, Mint},
};
use crate::{
    error::ExchangeBoothError,
    state::ExchangeBooth as ExchangeBooth
};
use std::mem::size_of;


pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
    fee: u8
) -> ProgramResult {
    const token_account_size: usize = 165; 
    let accounts_iter = &mut accounts.iter();

    // need to create token account for a, b
    let admin = next_account_info(accounts_iter)?;
    let mint_a = next_account_info(accounts_iter)?;
    let mint_b = next_account_info(accounts_iter)?;
    let vault_a = next_account_info(accounts_iter)?; // really just a token account for A
    let vault_b = next_account_info(accounts_iter)?; // really just a token account for B
    let system_program = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;
    let eb_ai = next_account_info(accounts_iter)?;
   
    // find the exchange booth PDA
    let (eb_pda, eb_bump) = Pubkey::find_program_address(
        &[
            b"eb_pda",
            admin.key.as_ref(),
            mint_a.key.as_ref(),
            mint_b.key.as_ref()
        ],
        program_id
    );

    // allocating exchange booth: 
    // invoke the system program in order to create the account that houses the EB struct
    invoke_signed(
        &system_instruction::create_account(
            admin.key, // usually just the fee payer
            eb_ai.key,
            Rent::get()?.minimum_balance(size_of::<ExchangeBooth>()),
            size_of::<ExchangeBooth>() as u64,
            program_id),
        &[admin.clone(), eb_ai.clone(), system_program.clone()],
        &[
            &[
                b"eb_pda", 
                admin.key.as_ref(), 
                mint_a.key.as_ref(), 
                mint_b.key.as_ref(), 
                &[eb_bump]
            ]
        ]
    )?;
    
    // Find the vault PDAs
    let (vault_a_pda, vault_a_bump) = Pubkey::find_program_address(
        &[
            b"vault_a_pda",
            admin.key.as_ref(),
            mint_a.key.as_ref(),
            eb_ai.key.as_ref()
        ],
        program_id
    );

    let (vault_b_pda, vault_b_bump) = Pubkey::find_program_address(
        &[
            b"vault_b_pda",
            admin.key.as_ref(),
            mint_b.key.as_ref(),
            eb_ai.key.as_ref()
        ],
        program_id
    );

    // allocating vault_a
    invoke_signed(
        &system_instruction::create_account(
            admin.key, // usually just the fee payer
            vault_a.key,
            Rent::get()?.minimum_balance(token_account_size),
            token_account_size.try_into().unwrap(),
            program_id),
        &[admin.clone(), vault_a.clone(), system_program.clone()],
        &[
            &[
                b"vault_a_pda", 
                admin.key.as_ref(), 
                vault_a.key.as_ref(), 
                &[vault_a_bump]
            ]
        ],
    )?;

    // allocating vault_b
    invoke_signed(
        &system_instruction::create_account(
            admin.key, // usually just the fee payer
            vault_b.key,
            Rent::get()?.minimum_balance(token_account_size),
            token_account_size.try_into().unwrap(),
            program_id),
        &[admin.clone(), vault_b.clone(), system_program.clone()],
        &[
            &[
                b"vault_a_pda", 
                admin.key.as_ref(), 
                vault_b.key.as_ref(), 
                &[vault_b_bump]
            ]
        ],
    )?;

    // initializing and allocating a vault_a token account
    let vault_a_token_account_ix = spl_token::instruction::initialize_account(
        token_program.key, // usually just the fee payer
        &vault_a_pda,
        mint_a.key,
        program_id
    );


    // Find program accounts
    // invoke program accounts

    // finally serialize the struct into the space allocated by the system instruction

    Ok(())
}
