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

import { Admin, Bob } from "./util";
import { writeFile, readFile } from "fs/promises";
import { getMint } from "./util";

// Debug niceties
const initTokensFilePath = "../debug_utils/init_token_accounts.json";

const ORACLE_PROGRAM_ID = new PublicKey(
  "AwrHP2q75CQKvdrKDhfk9nVjjvwVCpmirM5fACYBQGuL"
);
const { BN } = require("bn.js");

// Quick changing to dev and local nets
const LOCAL_NET = "http://127.0.0.1:8899";
const DEV_NET = clusterApiUrl("devnet");
const CONNECTION = LOCAL_NET;

// Necessary constants:
const oracleKey = new PublicKey("AE3nhQH1hNYA198w5yWoMzxtmyU4QD5Pad3dCgdpyPQN"); // This points to the actual buffer account where the oracle data is held
const oracleProgramId = new PublicKey(
  "ETgEKARSAfRtNsfuCLLxTRGrZjeUDMoqKfBim3SVRJo4"
);
const EB_PROGRAM_ID = new PublicKey(
  "6RUt7uZHZXas75zwR6fdTEvLH1xecXQvDy9qLHpeh4Bh"
);

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

const createOracle = async (connection: Connection, adminWallet: Keypair) => {
  console.log("Creating the Oracle ...");
  const echoBuffer = new Keypair();

  console.log("echoBuffer pubKey:", echoBuffer.publicKey.toBase58());

  // Now we must specify the data that the oracle will hold
  // const tokenAmountA = Buffer.from(new Uint8Array(new BN(1).toArray("le", 8)));
  // const tokenAmountB = Buffer.from(new Uint8Array(new BN(2).toArray("le", 8))); // the ratio is gonna be half of A to B, so A is worth twice as much as B
  // // create the data
  // let price_data = Buffer.concat([tokenAmountA, tokenAmountB]);

  const ratio = Buffer.from(new Uint8Array(new BN(0.5).toArray("le", 8)));
  const echoInstruction = Buffer.from(new Uint8Array([0]));
  const dataLen = Buffer.from(
    new Uint8Array(new BN(ratio.length).toArray("le", 4))
  );

  // create the account
  let createIx = SystemProgram.createAccount({
    fromPubkey: adminWallet.publicKey,
    newAccountPubkey: echoBuffer.publicKey,
    /** Amount of lamports to transfer to the created account */
    lamports: await connection.getMinimumBalanceForRentExemption(ratio.length),
    /** Amount of space in bytes to allocate to the created account */
    space: ratio.length,
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
    data: Buffer.concat([echoInstruction, dataLen, ratio]),
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
    `Init Exchange Booth Transaction Confirmed: https://explorer.solana.com/tx/${txid}?cluster=devnet`
  );

  let data = (
    await connection.getAccountInfo(echoBuffer.publicKey, "confirmed")
  )?.data;
  console.log("Echo Buffer Text:", data?.toString());

  // send the transaction, keeping track of that oracle key
};

const main = async () => {
  var args = process.argv.slice(2);
  const shouldAirdrop = parseInt(args[0]);
  const shouldCreateOracle = parseInt(args[1]);
  const debug = parseInt(args[2]);
  // const shouldInitTokens = parseInt(args[1]);
  // const echo = args[1];
  // const price = parseInt(args[2]);
  console.log(
    `Received args:
    shouldAirdrop: ${shouldAirdrop == 1}
    shouldCreateOracle: ${shouldCreateOracle == 1}
    debug: ${debug == 1}\n`
  );

  const connection = new Connection(CONNECTION);

  var adminWallet = Admin;

  var bobWallet = Bob; // bob is the user
  // TODO: replace this with a phantom wallet!
  // Note: the admin IS the mint authority in this exercise

  // Creating the token and assigning the token to an acc
  if (shouldAirdrop === 1) {
    await initialAirDrop(connection, adminWallet, bobWallet);
    return;
  }

  if (shouldCreateOracle === 1) {
    await createOracle(connection, adminWallet);
    return;
  }

  type InitTokensData = {
    mint_a: Token;
    mint_b: Token;
    admin_token_a_account: AccountInfo<any>; // any here is the type T of the data the account holds
    admin_token_b_account: AccountInfo<any>;
    bob_token_a_account: AccountInfo<any>;
  };

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
      pubkey: TOKEN_PROGRAM_ID,
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
};

main()
  .then(() => console.log("Success"))
  .catch((err) => console.log("oopsie:", err));
