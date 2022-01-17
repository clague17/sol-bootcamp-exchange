use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program::{invoke},
};


use crate::{
    state::ExchangeBooth,
};

use borsh::{BorshDeserialize};

pub fn assert_with_msg(statement: bool, err: ProgramError, msg: &str) -> ProgramResult {
    if !statement {
        msg!(msg);
        Err(err)
    } else {
        Ok(())
    }
}

// This is the program that the system admin will use to initially deposit funds into the exchange booth vaults
pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_a: u8,
    amount_b: u8
) -> ProgramResult {
    /* 
    * This program will take in the admin account and use the token program to move funds
    * from the admin's associated token account to the vaults A and B.
    * The input "amount" will be the WHOLE number of tokens to deposit into vaults A and B
    */
    let accounts_iter = &mut accounts.iter();

    let eb_ai = next_account_info(accounts_iter)?;
    let admin_ai = next_account_info(accounts_iter)?;
    let admin_token_a_acc = next_account_info(accounts_iter)?;
    let admin_token_b_acc = next_account_info(accounts_iter)?;
    let vault_a = next_account_info(accounts_iter)?;
    let vault_b = next_account_info(accounts_iter)?;
    let mint_a = next_account_info(accounts_iter)?;
    let mint_b = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;

    let eb = ExchangeBooth::try_from_slice(&eb_ai.data.borrow())?;

    assert_with_msg(
        *admin_ai.key == eb.admin, 
        ProgramError::IncorrectProgramId,
        "Incorrect Admin"
    );

    // finding the two vaults pdas
    let (vault_a_pda, vault_a_bump) = Pubkey::find_program_address(
        &[
            b"vault_a",
            admin_ai.key.as_ref(),
            mint_a.key.as_ref(),
            eb_ai.key.as_ref()
        ],
        program_id
    );

    let (vault_b_pda, vault_b_bump) = Pubkey::find_program_address(
        &[
            b"vault_b",
            admin_ai.key.as_ref(),
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

    // Now we have valid pdas for vault, we need to know how much to deposit where
    // do a token transfer from admin to vault a for amount_a
    let transfer_from_admin_to_vault_a_ix = spl_token::instruction::transfer(
        token_program.key,
        admin_token_a_acc.key,
        &vault_a_pda,
        admin_ai.key, // The owner of the admin account
        &[&admin_ai.key],
        amount_a.try_into().unwrap()
    )?;

    let transfer_from_admin_to_vault_b_ix = spl_token::instruction::transfer(
        token_program.key,
        admin_token_b_acc.key,
        &vault_b_pda,
        admin_ai.key, // The owner of the admin account
        &[&admin_ai.key],
        amount_b.try_into().unwrap()
    )?;

    msg!("Transfering {} tokens from admin to vault_a: {}", amount_a, vault_a_pda);

    invoke(
        &transfer_from_admin_to_vault_a_ix,
        &[
            admin_ai.clone(), admin_token_a_acc.clone(), vault_a.clone(), token_program.clone(),
        ],
    )?;

    msg!("Transfering {} tokens from admin to vault_b: {}", amount_b, vault_b_pda);

    invoke(
        &transfer_from_admin_to_vault_a_ix,
        &[
            admin_ai.clone(), admin_token_a_acc.clone(), vault_a.clone(), token_program.clone(),
        ],
    )?;

    msg!("Succesful deposit!\n");

    Ok(())
}