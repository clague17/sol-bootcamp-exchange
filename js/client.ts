import {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  clusterApiUrl,
  PublicKey,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  AccountInfo,
} from "@solana/web3.js";

import {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { Admin, Bob, DevnetAdmin, DevnetBob } from "./util";
import { writeFile, readFile } from "fs/promises";
import { getMint } from "./util";
// Debug niceties
// var initTokensFilePath = "../debug_utils/init_token_accounts.json";
// var initOracleFilePath = "../debug_utils/init_oracle_account.json";
// var ebFilePath = "../debug_utils/init_eb_account.json";

// Comment this out if not in devnet!!!!!!!!!!!!!!!!!!!
var initTokensFilePath = "../devnet_debug_utils/init_token_accounts.json";
var initOracleFilePath = "../devnet_debug_utils/init_oracle_account.json";
var ebFilePath = "../devnet_debug_utils/init_eb_account.json";

const tokenAccountsData = require("../devnet_debug_utils/init_token_accounts.json");
const oracleAccountData = require("../devnet_debug_utils/init_oracle_account.json");
const { BN } = require("bn.js");

// Quick changing to dev and local nets
const LOCAL_NET = "http://127.0.0.1:8899";
const DEV_NET = clusterApiUrl("devnet");
const CONNECTION = DEV_NET;

// Necessary constants:
const oracleKey = new PublicKey(
  oracleAccountData.oracle_buffer_address as string
); // This points to the actual buffer account where the oracle data is held
const oracleProgramId = new PublicKey(
  "AwrHP2q75CQKvdrKDhfk9nVjjvwVCpmirM5fACYBQGuL"
);
const EB_PROGRAM_ID = new PublicKey(
  "29e799E2EERqux5qDh5YHzXNdTKa3tBbjXSMHx1g5DL2"
);

const mint_a_pubkey = new PublicKey(tokenAccountsData.mint_a as string);
console.log("mint a address: ", tokenAccountsData.mint_a);
const mint_b_pubkey = new PublicKey(tokenAccountsData.mint_b as string);
console.log("mint b address: ", tokenAccountsData.mint_b);

const SWAP_FEE = 0.2; // will definitely have to play with the decimals on this
const INSTRUCTION_IDX = 0; // The instruction that you want the rust program to run

const initialAirDrop = async (
  connection: Connection,
  adminWallet: Keypair,
  bobWallet: Keypair
) => {
  // Airdrop sol to admin
  // Generate a new wallet keypair and airdrop SOL

  console.log("Airdropping 1 sol to admin...");
  var adminAirdropSignature = await connection.requestAirdrop(
    adminWallet.publicKey,
    2e9
  );
  await connection.confirmTransaction(adminAirdropSignature, "finalized");

  console.log("Airdropping 1 sol to bob...");

  // Airdrop sol to Bob wallet
  // Generate Bob wallet keypair
  var bobAirdropSignature = await connection.requestAirdrop(
    bobWallet.publicKey,
    2e9
  );
  await connection.confirmTransaction(bobAirdropSignature, "finalized");

  console.log(
    "ADMIN balance: ",
    await connection.getBalance(adminWallet.publicKey)
  );
  console.log(
    "BOB balance: ",
    await connection.getBalance(adminWallet.publicKey)
  );

  console.log("Airdrop complete :)\n");
};

// this functioni will create mint_a and mint_b.
// This function will create associated token accounts for the admin and user wallets
// for these new tokens mint_a and mint_b

const initTokens = async (
  connection: Connection,
  adminWallet: Keypair,
  bobWallet: Keypair,
  debug: boolean = false
) => {
  // mint_a with the mint authority as the admin

  console.log("Creating Mints...");
  console.log(
    "ADMIN balance: ",
    await connection.getBalance(adminWallet.publicKey)
  );
  console.log(
    "BOB balance: ",
    await connection.getBalance(bobWallet.publicKey)
  );

  let mint_a = await Token.createMint(
    connection,
    adminWallet,
    adminWallet.publicKey,
    null,
    6, // 6 decimals
    TOKEN_PROGRAM_ID
  );

  console.log(`Created MintA... ${mint_a.publicKey.toBase58()}`);

  let mint_b = await Token.createMint(
    connection,
    adminWallet,
    adminWallet.publicKey,
    null,
    6, // 6 decimals
    TOKEN_PROGRAM_ID
  );

  console.log(`Created MintB... ${mint_b.publicKey.toBase58()}`);

  // Now that we have the mints, we need to find a place to put generated tokens.
  // This place would be the associated token accounts for these wallets

  // Get the token account of the adminWallett olana address, if it does not exist, create it

  console.log(
    `Creating ADMIN (${adminWallet.publicKey}) associated token accounts ...`
  );
  let admin_token_a_account = await mint_a.getOrCreateAssociatedAccountInfo(
    adminWallet.publicKey
  );

  let admin_token_b_account = await mint_b.getOrCreateAssociatedAccountInfo(
    adminWallet.publicKey
  );

  //get the token account of the bobWallet Solana address, if it does not exist, create it
  console.log(
    `Creating BOB (${bobWallet.publicKey}) associated token accounts...`
  );
  let bob_token_a_account = await mint_a.getOrCreateAssociatedAccountInfo(
    bobWallet.publicKey
  );

  let bob_token_b_account = await mint_b.getOrCreateAssociatedAccountInfo(
    bobWallet.publicKey
  );

  // Now we have a place to put these two new tokens, after we use the two mints to airdrop them.

  // mint a token_a into adminTokenAccount
  console.log("Minting tokens to adminTokenAccount...");
  await mint_a.mintTo(
    admin_token_a_account.address,
    adminWallet.publicKey,
    [],
    LAMPORTS_PER_SOL
  );

  // mint a token_b into adminTokenAccount
  await mint_b.mintTo(
    admin_token_b_account.address,
    adminWallet.publicKey, // The authority is the owner of the mint account, destination pubkey doesn't matter
    [],
    LAMPORTS_PER_SOL
  );

  console.log(
    `minted token_a ${mint_a.publicKey} to admin ata: ${admin_token_a_account.address}`
  );

  console.log(
    `minted token_b ${mint_b.publicKey} to admin ata: ${admin_token_b_account.address}`
  );

  console.log("Minting token_a to bobTokenAccount...");

  // mint a token a into bob
  await mint_a.mintTo(
    bob_token_a_account.address,
    adminWallet.publicKey, // The authority is the owner of the mint account, destination pubkey doesn't matter
    [],
    LAMPORTS_PER_SOL
  );

  console.log(
    `minted token_a ${mint_a.publicKey} to bob ata: ${admin_token_a_account}`
  );

  // Now bob can transfer token_a for token_b using this exchange booth!
  console.log("Successfully minted tokens :)\n");

  //write all this info in case you want to debug and use explorer to monitor testing
  if (debug) {
    var data = {
      mint_a: mint_a.publicKey.toBase58(),
      mint_b: mint_b.publicKey.toBase58(),
      admin_token_a_account: admin_token_a_account.address.toBase58(),
      admin_token_b_account: admin_token_b_account.address.toBase58(),
      bob_token_a_account: bob_token_a_account.address.toBase58(),
      bob_token_b_account: bob_token_b_account.address.toBase58(),
    };

    writeFile(initTokensFilePath, JSON.stringify(data))
      .then(() =>
        console.log(`Wrote Token Accounts to ${initTokensFilePath}\n`)
      )
      .catch((err) =>
        console.log(`Error writing Token Accounts to ${initTokensFilePath}\n`)
      );
  }

  return [mint_a, mint_b];
};

const initializeVaults = async (
  connection: Connection,
  adminWallet: Keypair,
  mint_a: Token,
  mint_b: Token,
  eb_pda: PublicKey
) => {
  // get the two vaults:
  console.log("In InitializeVaults:");
  let vault_a_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_a.publicKey,
    eb_pda,
    true
  );
  let vault_b_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_b.publicKey,
    eb_pda,
    true
  );

  console.log("Vault A: ", vault_a_key.toBase58());
  console.log("Vault B: ", vault_b_key.toBase58());

  let vault_a_account_ix = Token.createAssociatedTokenAccountInstruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_a.publicKey,
    vault_a_key,
    eb_pda,
    adminWallet.publicKey
  );

  let vault_b_account_ix = Token.createAssociatedTokenAccountInstruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_b.publicKey,
    vault_b_key,
    eb_pda,
    adminWallet.publicKey
  );

  let tx = new Transaction();
  tx.add(vault_a_account_ix).add(vault_b_account_ix);

  let txid = await sendAndConfirmTransaction(connection, tx, [adminWallet], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
  console.log(
    `Vault Transaction Confirmed: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );

  return [vault_a_key, vault_b_key];
};

const createOracle = async (
  connection: Connection,
  adminWallet: Keypair,
  debug: number
) => {
  console.log("Creating the Oracle ...");
  const echoBuffer = new Keypair();

  console.log("echoBuffer pubKey:", echoBuffer.publicKey.toBase58());

  // Now we must specify the data that the oracle will hold
  // const tokenAmountA = Buffer.from(new Uint8Array(new BN(1).toArray("le", 8)));
  // const tokenAmountB = Buffer.from(new Uint8Array(new BN(2).toArray("le", 8))); // the ratio is gonna be half of A to B, so A is worth twice as much as B
  // // create the data
  // let price_data = Buffer.concat([tokenAmountA, tokenAmountB]);

  const echoInstruction = Buffer.from(new Uint8Array([0]));
  const tokenAmount1 = 1 * 10 ** 6;
  const tokenAmount2 = 2 * 10 ** 6;
  const oracleData = Buffer.concat([
    Buffer.from(new Uint8Array(new BN(tokenAmount1).toArray("le", 8))),
    Buffer.from(new Uint8Array(new BN(tokenAmount2).toArray("le", 8))),
  ]);

  const dataLen = Buffer.from(
    new Uint8Array(new BN(oracleData.length).toArray("le", 4))
  );

  // create the account
  let createIx = SystemProgram.createAccount({
    fromPubkey: adminWallet.publicKey,
    newAccountPubkey: echoBuffer.publicKey,
    /** Amount of lamports to transfer to the created account */
    lamports: await connection.getMinimumBalanceForRentExemption(
      oracleData.length
    ),
    /** Amount of space in bytes to allocate to the created account */
    space: oracleData.length,
    /** Public key of the program to assign as the owner of the created account */
    programId: oracleProgramId,
  });

  let echoIx = new TransactionInstruction({
    keys: [
      {
        pubkey: echoBuffer.publicKey,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: oracleProgramId,
    data: Buffer.concat([echoInstruction, dataLen, oracleData]),
  });

  const tx = new Transaction();
  tx.add(createIx).add(echoIx);

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [adminWallet, echoBuffer], //adminWallet is just an arbitrary mint Authority, could be anyone!
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    }
  );

  console.log(
    `Init Oracle Transaction Confirmed: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );

  let data = (
    await connection.getAccountInfo(echoBuffer.publicKey, "confirmed")
  )?.data;
  console.log("Echo Buffer Text:", data?.toString("utf16le"));

  if (debug == 1) {
    let payload = {
      oracle_buffer_address: echoBuffer.publicKey.toBase58(),
      oracle_buffer_data: data?.toString("utf16le"),
    };

    writeFile(initOracleFilePath, JSON.stringify(payload))
      .then(() => console.log(`Wrote Oracle Info to ${initOracleFilePath}\n`))
      .catch((err) =>
        console.log(`Error writing Oracle Info to ${initOracleFilePath}\n`)
      );
  }

  // send the transaction, keeping track of that oracle key
};

const updateOraclePrice = async (
  connection: Connection,
  adminWallet: Keypair,
  debug: number
) => {
  console.log("Updating oracle rate");
  let echoBuffer = new PublicKey(
    oracleAccountData.oracle_buffer_address as string
  );
  const echoInstruction = Buffer.from(new Uint8Array([0]));
  const tokenAmount1 = 1 * 10 ** 6;
  const tokenAmount2 = 2 * 10 ** 6;
  const oracleData = Buffer.concat([
    Buffer.from(new Uint8Array(new BN(tokenAmount1).toArray("le", 8))),
    Buffer.from(new Uint8Array(new BN(tokenAmount2).toArray("le", 8))),
  ]);

  const dataLen = Buffer.from(
    new Uint8Array(new BN(oracleData.length).toArray("le", 4))
  );

  let echoIx = new TransactionInstruction({
    keys: [
      {
        pubkey: echoBuffer,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: oracleProgramId,
    data: Buffer.concat([echoInstruction, dataLen, oracleData]),
  });

  const tx = new Transaction();
  tx.add(echoIx);

  let txid = await sendAndConfirmTransaction(
    connection,
    tx,
    [adminWallet], //adminWallet is just an arbitrary mint Authority, could be anyone!
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    }
  );

  console.log(
    `Update Oracle Transaction Confirmed: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );

  let data = (await connection.getAccountInfo(echoBuffer, "confirmed"))?.data;
  console.log("Echo Buffer Text:", data?.toString("utf16le"));

  if (debug == 1) {
    let payload = {
      oracle_buffer_address: echoBuffer.toBase58(),
      oracle_buffer_data: data?.toString("utf16le"),
    };

    writeFile(initOracleFilePath, JSON.stringify(payload))
      .then(() => console.log(`Wrote Oracle Info to ${initOracleFilePath}\n`))
      .catch((err) =>
        console.log(`Error writing Oracle Info to ${initOracleFilePath}\n`)
      );
  }
};

const logBalances = async (
  connection: Connection,
  wallet1: PublicKey,
  ebPDA: PublicKey,
  wallet2?: PublicKey
) => {
  // check balances
  const userToken1AccountInfo = (
    await connection.getParsedTokenAccountsByOwner(wallet1, {
      mint: mint_a_pubkey,
    })
  ).value[0].account.data.parsed.info;
  const userToken2AccountInfo = (
    await connection.getParsedTokenAccountsByOwner(wallet1, {
      mint: mint_b_pubkey,
    })
  ).value[0].account.data.parsed.info;
  let vault1AccountInfo = (
    await connection.getParsedTokenAccountsByOwner(ebPDA, {
      mint: mint_a_pubkey,
    })
  ).value[0].account.data.parsed.info;
  let vault2AccountInfo = (
    await connection.getParsedTokenAccountsByOwner(ebPDA, {
      mint: mint_b_pubkey,
    })
  ).value[0].account.data.parsed.info;

  console.log(
    "userToken1Account balance:",
    userToken1AccountInfo.tokenAmount.uiAmount
  );
  console.log(
    "userToken2ccount balance:",
    userToken2AccountInfo.tokenAmount.uiAmount
  );
  console.log("vault1Account balance:", vault1AccountInfo.tokenAmount.uiAmount);
  console.log("vault2Account balance:", vault2AccountInfo.tokenAmount.uiAmount);
};

const adminDepositTokensManual = async (
  connection: Connection,
  adminWallet: Keypair
) => {
  console.log("Execute Deposit Tokens");

  console.log("Creating deposits instruction...");
  const depositAmount = 100;

  let depositIdx = Buffer.from(new Uint8Array([1]));

  let depositAmountA = Buffer.from(
    new Uint8Array(new BN(depositAmount * 10 ** 6).toArray("le", 8)) // 6 decimals for both mints :)
  );
  let depositAmountB = Buffer.from(
    new Uint8Array(new BN(depositAmount * 10 ** 6).toArray("le", 8)) // 6 decimals for both mints :)
  );

  let [ebPDA, ebBumpSeed] = await PublicKey.findProgramAddress(
    [
      Buffer.from("eb_pda"),
      adminWallet.publicKey.toBuffer(),
      mint_a_pubkey.toBuffer(),
      mint_b_pubkey.toBuffer(),
    ],
    EB_PROGRAM_ID
  );
  console.log("ebPDA: ", ebPDA.toBase58());

  let vault_a_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_a_pubkey,
    ebPDA,
    true
  ).then((res) => res.toBase58());

  let vault_b_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_b_pubkey,
    ebPDA,
    true
  ).then((res) => res.toBase58());

  console.log("vaults: ", vault_a_key, vault_b_key);

  let adminATokenAccount = new PublicKey(
    tokenAccountsData.admin_token_a_account as string
  );

  let adminBTokenAccount = new PublicKey(
    tokenAccountsData.admin_token_b_account as string
  );

  console.log("Sending the deposit instruction!");

  let depositIx = new TransactionInstruction({
    keys: [
      { pubkey: ebPDA, isSigner: false, isWritable: false },
      { pubkey: adminWallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: mint_a_pubkey, isSigner: false, isWritable: false },
      { pubkey: mint_b_pubkey, isSigner: false, isWritable: false },
      { pubkey: adminATokenAccount, isSigner: false, isWritable: true },
      { pubkey: adminBTokenAccount, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(vault_a_key), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(vault_b_key), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: EB_PROGRAM_ID,
    data: Buffer.concat([depositIdx, depositAmountA, depositAmountB]),
  });

  // make the tx
  let depositTx = new Transaction();
  depositTx.add(depositIx);

  // send tx
  let depositTxID = await sendAndConfirmTransaction(
    connection,
    depositTx,
    [adminWallet],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
    }
  );

  // tx url on devnet
  console.log(`Deposit of ${depositAmount} to vault_a and vault_b confirmed:`);
  console.log(`https://explorer.solana.com/tx/${depositTxID}?cluster=devnet`);

  logBalances(connection, adminWallet.publicKey, ebPDA);
};

const exchangeTokens = async (
  connection: Connection,
  adminWallet: Keypair,
  bobWallet: Keypair
) => {
  const exchangeIdx = Buffer.from(new Uint8Array([3]));
  const swapAmount = 2;

  const swapAmountBuff = Buffer.from(
    new Uint8Array(new BN(swapAmount * 10 ** 6).toArray("le", 8)) // 6 decimals for both mints :)
  );

  console.log("Execute Exchange tokens!");
  console.log("Finding eb PDA...");

  let [ebPDA, ebBumpSeed] = await PublicKey.findProgramAddress(
    [
      Buffer.from("eb_pda"),
      adminWallet.publicKey.toBuffer(),
      mint_a_pubkey.toBuffer(),
      mint_b_pubkey.toBuffer(),
    ],
    EB_PROGRAM_ID
  );

  console.log("Exchange");
  console.log("Finding vault Addresses...");

  // The vaults here are NOT PDAs, they are just token accounts that are owned by the exchange Booth, which itself is a PDA. In order to sign for transactions, the exchange booth can do it, which is fine since it itself is a PDA and can sign for stuff itself

  let vault_a_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_a_pubkey,
    ebPDA,
    true
  );
  let vault_b_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_b_pubkey,
    ebPDA,
    true
  );

  let bobFromTokenAccount = new PublicKey(
    tokenAccountsData.bob_token_a_account as string
  );

  let bobToTokenAccount = new PublicKey(
    tokenAccountsData.bob_token_b_account as string
  );

  console.log("Creating transaction instruction...");

  let exchangeIx = new TransactionInstruction({
    keys: [
      { pubkey: ebPDA, isSigner: false, isWritable: true },
      { pubkey: vault_a_key, isSigner: false, isWritable: true },
      { pubkey: vault_b_key, isSigner: false, isWritable: true },
      { pubkey: bobWallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: bobFromTokenAccount, isSigner: false, isWritable: true },
      { pubkey: bobToTokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint_a_pubkey, isSigner: false, isWritable: false },
      { pubkey: mint_b_pubkey, isSigner: false, isWritable: false },
      { pubkey: oracleKey, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: EB_PROGRAM_ID,
    data: Buffer.concat([exchangeIdx, swapAmountBuff]),
  });

  // make the tx
  let exchangeTx = new Transaction();
  exchangeTx.add(exchangeIx);

  console.log("Sending transaction...");

  // send tx
  let exchangeTxid = await sendAndConfirmTransaction(
    connection,
    exchangeTx,
    [bobWallet],
    {
      skipPreflight: true,
      preflightCommitment: "confirmed",
    }
  );

  // tx url on devnet
  console.log(`https://explorer.solana.com/tx/${exchangeTxid}?cluster=devnet`);

  logBalances(connection, bobWallet.publicKey, ebPDA);
};

const main = async () => {
  var args = process.argv.slice(2);
  const shouldAirdrop = parseInt(args[0]);
  const shouldInitExchangeBooth = parseInt(args[1]);
  const shouldCreateOracle = parseInt(args[2]);
  const shouldDepositTokens = parseInt(args[3]);
  const shouldExchangeTokens = parseInt(args[4]);
  const shouldUpdateOraclePrice = parseInt(args[5]);
  const debug = parseInt(args[6]);
  // const shouldInitTokens = parseInt(args[1]);
  // const echo = args[1];
  // const price = parseInt(args[2]);
  console.log(
    `Received args:
    shouldAirdrop: ${shouldAirdrop == 1}
    shouldInitExchangeBooth: ${shouldInitExchangeBooth == 1}
    shouldCreateOracle: ${shouldCreateOracle == 1}
    shouldDepositTokens: ${shouldDepositTokens == 1}
    shouldTransferTokens: ${shouldExchangeTokens == 1}
    updateOraclePrice: ${shouldUpdateOraclePrice == 1}
    debug: ${debug == 1}\n`
  );

  const connection = new Connection(CONNECTION);

  var adminWallet = DevnetAdmin;

  var bobWallet = DevnetBob; // bob is the user
  // TODO: replace this with a phantom wallet!
  // Note: the admin IS the mint authority in this exercise

  // Creating the token and assigning the token to an acc
  if (shouldAirdrop === 1) {
    await initialAirDrop(connection, adminWallet, bobWallet);
    return;
  }

  if (shouldCreateOracle === 1) {
    await createOracle(connection, adminWallet, debug);
    return;
  }

  if (shouldDepositTokens === 1) {
    await adminDepositTokensManual(connection, adminWallet);
    return;
  }

  if (shouldExchangeTokens === 1) {
    await exchangeTokens(connection, adminWallet, bobWallet);
    return;
  }

  if (shouldUpdateOraclePrice === 1) {
    await updateOraclePrice(connection, adminWallet, debug);
    return;
  }

  type InitTokensData = {
    mint_a: Token;
    mint_b: Token;
    admin_token_a_account: AccountInfo<any>; // any here is the type T of the data the account holds
    admin_token_b_account: AccountInfo<any>;
    bob_token_a_account: AccountInfo<any>;
  };

  if (shouldInitExchangeBooth) {
    console.log("Instruction: Initializing Exchange Booth!");
  }

  const [mint_a, mint_b] = await initTokens(
    connection,
    adminWallet,
    bobWallet,
    debug == 1
  );

  // After here we have the mints, we have the token accounts, all we need left are the vaults
  // In order to initialize the vaults, we need to get the PDA for the exchange booth.
  // This is because we need to set the PDA as the authority of the vaults

  let [ebPDA, ebBumpSeed] = await PublicKey.findProgramAddress(
    [
      Buffer.from("eb_pda"),
      adminWallet.publicKey.toBuffer(),
      mint_a.publicKey.toBuffer(),
      mint_b.publicKey.toBuffer(),
    ],
    EB_PROGRAM_ID
  );

  console.log("Exchange booth address: ", ebPDA.toBase58());

  const [vault_a_key, vault_b_key] = await initializeVaults(
    connection,
    adminWallet,
    mint_a,
    mint_b,
    ebPDA
  );
  // Now we have initialized the two vaults!

  // Creating the Exchange Booth Instruction
  const ExchangeBoothKeys = [
    {
      pubkey: adminWallet.publicKey,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: (mint_a as Token).publicKey,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: (mint_b as Token).publicKey,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault_a_key,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault_b_key,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: oracleKey,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: ebPDA,
      isSigner: false,
      isWritable: true,
    },
  ];

  let initExchangeBooth_ix = new TransactionInstruction({
    keys: ExchangeBoothKeys,
    programId: EB_PROGRAM_ID,
    data: Buffer.from([INSTRUCTION_IDX, SWAP_FEE]),
  });

  const tx = new Transaction();
  tx.add(initExchangeBooth_ix);

  let txid = await sendAndConfirmTransaction(connection, tx, [adminWallet], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
  console.log(
    `Init Exchange Booth Transaction Confirmed: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );

  if (debug == 1) {
    let payload = {
      exchange_booth_address: ebPDA.toBase58(),
    };

    writeFile(ebFilePath, JSON.stringify(payload))
      .then(() => console.log(`Wrote EB info to ${ebFilePath}\n`))
      .catch((err) => console.log(`Error writing EB Info to ${ebFilePath}\n`));
  }
};

main()
  .then(() => console.log("Success"))
  .catch((err) => console.log("oopsie:", err));
