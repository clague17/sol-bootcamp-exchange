use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum ExchangeBoothInstruction {

    // Create(accounts, data)
    // The accounts that are needed

    // Admin (S)
    // mint A, mint B
    // vault A, vault B (these could be PDAs)
    // Exchange Booth account
    // Oracle account
    // TokenProgram account, 
    // System Program account

    // 
    /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ❌       | ✅     | admin: pubkey of the admin account | 
    /// | 1     | ❌       | ❌     | mint_a: The mint of the first token           |
    /// | 2     | ❌       | ❌    | mint_b: The mint for the second token                             |
    /// | 4     | ✅       | ❌    | vault_a: The vault for the first mint                            |
    /// | 5     | ✅       | ❌    | vault_b: The vault for the second mint                            |
    /// | 6     | ❌       | ❌    | oracle: The oracle program (echo program with a static oracle)                           |
    InititializeExchangeBooth { fee: u8 },

    Deposit {
        // TODO
        amount_a: u8,
        amount_b: u8
    },

    // Withdraw some of mint A from vault A 
    Withdraw {
        // TODO
    },
        /// Accounts:
    /// | index | writable | signer | description                                                              |
    /// |-------|----------|--------|--------------------------------------------------------------------------|
    /// | 0     | ✅       | ❌     | customer_token_account:  |
    /// | 1     | ❌       | ✅     | customer_account:          |
    /// | 2     | ❌       | ❌    | exchange_booth: Maybe you want to write volume data! If so then this needs to be writeable |
    /// | 3     | ✅       | ❌    | vault_a: The vault for the first mint                            |
    /// | 4     | ✅       | ❌    | vault_b: The vault for the second mint                            |
    /// | 5     | ❌       | ❌    | token_program: The vault for the second mint                            |
    /// | 6     | ❌       | ❌    | pda_signer: This would be the owner of the vaults, which is the one that's to sign for the withdrawal from the vaults 
    /// | 7     | ❌       | ❌    | mint_a: You need the decimals which live on the mint object.
    /// | 8     | ❌       | ❌    | mint_b: You need the decimals which live on the mint object.
    /// 
    /// 
    /// On the typing of the tokens corresponding to the amount that a customer might hold
    /// Mint: decimals : u8 (d) 
    /// TokenAccount: amount: u64 (a)
    /// a * 10 ^ (-d)
    /// 
    /// For the exchange calculations, you need a_in, d_in to calculate the a_out and d_out, the fee parameters of the exchange booth
    /// 
    /// LOOK OUT FOR ROUNDING ERRORS AND NUMERICAL OVERFLOW
    /// 
    /// The oracle should provide what the price information is. Figure out some error-tolerance. 
    /// The arguments for this exchange step would be the amount of token to be traded, and the swap direction.
    /// 
    /// Based on whatever mint is included in the tokenaccount,


    Exchange {
        amount: f64
    },
    CloseExchangeBooth {
        // TODO
    },
}
