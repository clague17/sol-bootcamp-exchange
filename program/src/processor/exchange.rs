use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program_pack::Pack,
    sysvar::{rent::Rent, Sysvar},
    program::{invoke_signed},
};

use crate::{
    error::ExchangeBoothError,
    state::ExchangeBooth,
    state::ExchangeRate
};

use spl_token::{
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
    amount: f64
) -> ProgramResult {

    // This is the main swap function!
    let account_info_iter = &mut accounts.iter();

    // what accounts do we need? 
    let eb_ai = next_account_info(account_info_iter)?;
    let customer_ai = next_account_info(account_info_iter)?;
    let customer_from = next_account_info(account_info_iter)?;
    let customer_to = next_account_info(account_info_iter)?;
    let vault_a = next_account_info(account_info_iter)?;
    let vault_b = next_account_info(account_info_iter)?;
    let mint_a_ai = next_account_info(account_info_iter)?;
    let mint_b_ai = next_account_info(account_info_iter)?;
    let oracle = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    let exchange_booth = ExchangeBooth::try_from_slice(&eb_ai.data.borrow())?;
    let vault_a_token_acc = TokenAccount::unpack_from_slice(&vault_a.try_borrow_data()?)?;
    let vault_b_token_acc = TokenAccount::unpack_from_slice(&vault_b.try_borrow_data()?)?;
    let customer_from_token_acc = TokenAccount::unpack_from_slice(&customer_from.try_borrow_data()?)?;
    let mint_a = Mint::unpack_from_slice(&mint_a_ai.try_borrow_data()?)?;
    let mint_b = Mint::unpack_from_slice(&mint_b_ai.try_borrow_data()?)?;
    let customer_to_token_acc = TokenAccount::unpack_from_slice(&customer_to.try_borrow_data()?)?;
    let exchange_rate_struct = ExchangeRate::try_from_slice(&oracle.data.borrow())?;

    // Checking the correct signing and writability of the accounts.
    assert_with_msg(
        customer_ai.is_signer, 
        ProgramError::MissingRequiredSignature,
        "Customer Account is not signer"
    );
    assert_with_msg(
        vault_a.is_writable, 
        ProgramError::MissingRequiredSignature,
        "Vault A is not writable"
    );

    assert_with_msg(
        vault_b.is_writable, 
        ProgramError::MissingRequiredSignature,
        "Vault B is not writable"
    );

    assert_with_msg(
        vault_a.is_writable, 
        ProgramError::MissingRequiredSignature,
        "Vault A is not writable"
    );

    assert_with_msg(
        customer_to.is_writable, 
        ProgramError::MissingRequiredSignature,
        "Customer Account is not signer"
    );


    //checking the mint accounts

    assert_with_msg(
        vault_a_token_acc.mint != *mint_a_ai.key, 
        ProgramError::InvalidArgument,
        "Vault A mint address is not equal to mint A"
    );

    assert_with_msg(
        vault_b_token_acc.mint != *mint_b_ai.key, 
        ProgramError::InvalidArgument,
        "Vault B mint address is not equal to mint B"
    );

    // The program will do two things

    //0. determine the trade direction based on the accounts that were passed in
    //1. Based on the trade direction, do a token transfer from customer token account to vault_x
    //2. Then do a token transfer from vault_y to customer's other token account
    //We'd need to check that the customer has that other token account, if not create one for them before going through with the transfer


    // Step 0: figure out trade dir

    // assuming it's a -> b
    let mut a_to_b = true;
    let mut exchange_rate = exchange_rate_struct.a_to_b;
    let mut from_decimal = mint_a.decimals;
    let mut to_decimal = mint_b.decimals;
    let mut from_token = "A";
    let mut to_token = "B";

    // Actually see if we need to flip all this
    if customer_from_token_acc.mint == *mint_b_ai.key {
        a_to_b = false;
        exchange_rate = exchange_rate_struct.b_to_a;
        from_decimal = mint_b.decimals;
        to_decimal = mint_a.decimals;
        from_token = "B";
        to_token = "A";
    }

    // Calculate how much is actually needed to trade
    let received = amount * exchange_rate;
    let amount_small: u64 = (amount * f64::powf(10., from_decimal.into())) as u64;
    let received_small: u64 = (received * f64::powf(10., to_decimal.into())) as u64;

    msg!("Customer wants to exchange {} ({}) token {} for {} ({}) token {} with exchange rate {}",
        amount,
        amount_small,
        from_token,
        received,
        received_small,
        to_token,
        exchange_rate
    );

    // onto step 1
    let transfer_from_customer_to_vault_ix = spl_token::instruction::transfer(
        token_program.key,
        customer_from.key,
        if a_to_b {&exchange_booth.vault_a} else {&exchange_booth.vault_b},
        &customer_ai.key,
        &[&customer_ai.key],
        amount_small
    )?;
    
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

    let transfer_from_vault_to_customer_ix = spl_token::instruction::transfer(
        token_program.key,
        if a_to_b {&exchange_booth.vault_a} else {&exchange_booth.vault_b},
        customer_to.key,
        if a_to_b {&exchange_booth.vault_a} else {&exchange_booth.vault_b},
        &[ if a_to_b {&exchange_booth.vault_a} else {&exchange_booth.vault_b}],
        received_small
    )?;

    msg!("Transfering token {}", to_token);

    invoke_signed(
        &transfer_from_vault_to_customer_ix,
        &[
            customer_ai.clone(),
            customer_to.clone(),
            if a_to_b {vault_a.clone()} else{vault_b.clone()},
            token_program.clone(),
        ],
        &[&[
            b"exchange_booth",
            exchange_booth.admin.as_ref(),
            mint_a_ai.key.as_ref(),
            if a_to_b {mint_a_ai.key.as_ref()} else{mint_b_ai.key.as_ref()},
            &[eb_bump]
        ]],
    )?;

    msg!("Successfully transferred ")

    Ok(())
}