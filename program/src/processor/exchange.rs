use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program_pack::Pack,
    program::{invoke, invoke_signed},
};

use crate::{
    state::ExchangeBooth,
    state::Oracle
};

use spl_token::{
    id, instruction,
    state::Account as TokenAccount,
    state::Mint as Mint,
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

pub fn process(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64
) -> ProgramResult {
    // This is the main swap function!
    let accounts_iter = &mut accounts.iter();

    // what accounts do we need? 
    let eb_ai = next_account_info(accounts_iter)?;
    let vault_a = next_account_info(accounts_iter)?;
    let vault_b = next_account_info(accounts_iter)?;
    let customer_ai = next_account_info(accounts_iter)?;
    let customer_from = next_account_info(accounts_iter)?;
    let customer_to = next_account_info(accounts_iter)?;
    let mint_a_ai = next_account_info(accounts_iter)?;
    let mint_b_ai = next_account_info(accounts_iter)?;
    let oracle = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;

    msg!["Trying to borrow data!"];
    msg!("exchange booth address {:?}", eb_ai.key);

    let exchange_booth = ExchangeBooth::try_from_slice(&eb_ai.try_borrow_data()?)?;

    msg!("Exchange Booth deserialized successfully");

    let customer_from_token_acc = TokenAccount::unpack_from_slice(&customer_from.try_borrow_data()?)?;

    let exchange_rate_struct = Oracle::try_from_slice(&oracle.try_borrow_data()?)?;

    msg!("oracle deserialized successfully");

    // Checking the correct signing and writability of the accounts.
    assert_with_msg(
        customer_ai.is_signer, 
        ProgramError::MissingRequiredSignature,
        "Customer Account is not signer"
    )?;

    assert_with_msg(
        vault_b.is_writable, 
        ProgramError::MissingRequiredSignature,
        "Vault B is not writable"
    )?;

    assert_with_msg(
        vault_a.is_writable, 
        ProgramError::MissingRequiredSignature,
        "Vault A is not writable"
    )?;

    assert_with_msg(
        customer_to.is_writable, 
        ProgramError::MissingRequiredSignature,
        "Customer Account is not signer"
    )?;



    // The program will do two things

    //0. determine the trade direction based on the accounts that were passed in
    //1. Based on the trade direction, do a token transfer from customer token account to vault_x
    //2. Then do a token transfer from vault_y to customer's other token account
    //We'd need to check that the customer has that other token account, if not create one for them before going through with the transfer


    // Step 0: figure out trade dir

    // assuming it's a -> b
    let mut a_to_b = true;
    let mut deposit_factor = exchange_rate_struct.token_amount1;
    let mut withdraw_factor = exchange_rate_struct.token_amount2;  
    let mut to_token = "B";
    let mut deposit_vault = vault_a;
    let mut withdraw_vault = vault_b;

    // Actually see if we need to flip all this
    if customer_from_token_acc.mint == *mint_b_ai.key {
        a_to_b = false;
        deposit_factor = exchange_rate_struct.token_amount2;
        withdraw_factor = exchange_rate_struct.token_amount1;
        to_token = "A";
        deposit_vault = vault_b;
        withdraw_vault = vault_a;
    }

    let mut fee_amount = ((amount as f64) * (exchange_booth.fee as f64) / (100 as f64)) as u64;
    fee_amount = 0; // Update this to introduce a fee for the exchange to actually make some money :) 
    let deposit_amount = amount - fee_amount;
    let withdraw_amount = (((deposit_amount * withdraw_factor) as f64) / deposit_factor as f64) as u64;

    msg!("fee_amount: {}\ndeposit_amount: {}\nwithdraw_amount:{}", fee_amount, deposit_amount, withdraw_amount);


    // onto step 1
    let transfer_from_customer_to_vault_ix = spl_token::instruction::transfer(
        &spl_token::id(),
        &customer_from.key,
        &deposit_vault.key,
        &customer_ai.key,
        &[&customer_ai.key],
        deposit_amount
    )?;

    invoke(
        &transfer_from_customer_to_vault_ix,
        &[
            customer_from.clone(),
            deposit_vault.clone(),
            customer_ai.clone(),
            token_program.clone()
        ]
    )?;

    msg!("We deposited from Bob to vault");
    
    // In order to do the other side of this transfer, we need to get the bump seed in order to invoke sign. Since the vault is a PDA and the owner of the vault is the exchange booth, which is also a PDA. We need the exchange booth's pda

    let (_, eb_bump) = Pubkey::find_program_address(
        &[
            b"eb_pda",
            exchange_booth.admin.as_ref(),
            mint_a_ai.key.as_ref(),
            mint_b_ai.key.as_ref()
        ],
        program_id
    );

    msg!("Transfering token {} to user", to_token);

    let transfer_from_vault_to_customer_ix = 
    spl_token::instruction::transfer(
        &spl_token::id(),
        &withdraw_vault.key,
        &customer_to.key,
        &eb_ai.key,
        &[],
        withdraw_amount
    )?;

    invoke_signed(
        &transfer_from_vault_to_customer_ix,
        &[
            eb_ai.clone(),
            customer_to.clone(),
            withdraw_vault.clone(),
            token_program.clone()
        ],
        &[&[
            b"eb_pda",
            exchange_booth.admin.as_ref(),
            mint_a_ai.key.as_ref(),
            mint_b_ai.key.as_ref(),
            &[eb_bump]
        ]],
    )?;

    msg!("Successfully transferred");

    Ok(())
}