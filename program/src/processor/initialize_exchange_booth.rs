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


pub fn assert_with_msg(statement: bool, err: ProgramError, msg: &str) -> ProgramResult {
    if !statement {
        msg!(msg);
        Err(err)
    } else {
        Ok(())
    }
}

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
    let oracle = next_account_info(accounts_iter)?;
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

    assert_with_msg(
        eb_pda == *eb_ai.key, 
        ProgramError::IncorrectProgramId, 
        "Incorrect Exchange Booth account input"
    );

    // now we can check the pdas are correct for the vaults

    let (vault_a_pda, vault_a_bump) = Pubkey::find_program_address(
        &[
            b"vault_a",
            admin.key.as_ref(),
            mint_a.key.as_ref(),
            eb_ai.key.as_ref()
        ],
        program_id
    );

    let (vault_b_pda, vault_b_bump) = Pubkey::find_program_address(
        &[
            b"vault_b",
            admin.key.as_ref(),
            mint_b.key.as_ref(),
            eb_ai.key.as_ref()
        ],
        program_id
    );

    assert_with_msg(
        *vault_a.key == vault_a_pda, 
        ProgramError::IncorrectProgramId, 
        "Incorrect Vault"
    );

    assert_with_msg(
        *vault_b.key == vault_b_pda, 
        ProgramError::IncorrectProgramId, 
        "Incorrect Vault"
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

    // finally serialize the struct into the space allocated by the system instruction
    let mut eb = ExchangeBooth {
        admin: *admin.key,
        vaultA: *vault_a.key,
        vaultB:  *vault_b.key,
        oracle: *oracle.key,
        fee: fee
    };

    eb.serialize(&mut *eb_ai.data.borrow_mut());

    Ok(())
}
