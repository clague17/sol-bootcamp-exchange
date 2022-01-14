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
} from "@solana/web3.js";

import {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const ebProgramID = new PublicKey(
  "AwrHP2q75CQKvdrKDhfk9nVjjvwVCpmirM5fACYBQGuL"
);

// Quick changing to dev and local nets
const LOCAL_NET = "http://127.0.0.1:8899";
const DEV_NET = clusterApiUrl("devnet");
const CONNECTION = LOCAL_NET;

const initialAirdrop = async (
  connection: Connection,
  adminWallet: Keypair,
  bobWallet: Keypair
) => {
  // Airdrop sol to admin
  // Generate a new wallet keypair and airdrop SOL

  console.log("Airdropping 1 sol to admin...");
  var adminAirdropSignature = await connection.requestAirdrop(
    adminWallet.publicKey,
    LAMPORTS_PER_SOL
  );

  console.log("Airdropping 1 sol to bob...");

  // Airdrop sol to Bob wallet
  // Generate Bob wallet keypair
  var bobAirdropSignature = await connection.requestAirdrop(
    bobWallet.publicKey,
    LAMPORTS_PER_SOL
  );

  console.log("Airdrop complete :)");
};

// this functioni will create mint_a and mint_b.
// This function will create associated token accounts for the admin and user wallets
// for these new tokens mint_a and mint_b

const initTokens = async (
  connection: Connection,
  adminWallet: Keypair,
  bobWallet: Keypair
) => {
  // mint_a with the mint authority as the admin

  console.log("Creating Mints...");
  const mint_a = await Token.createMint(
    connection,
    adminWallet,
    adminWallet.publicKey,
    null,
    6, // 6 decimals
    TOKEN_PROGRAM_ID
  );

  const mint_b = await Token.createMint(
    connection,
    adminWallet,
    adminWallet.publicKey,
    null,
    6, // 6 decimals
    TOKEN_PROGRAM_ID
  );

  // Now that we have the mints, we need to find a place to put generated tokens.
  // This place would be the associated token accounts for these wallets

  // Get the token account of the adminWallett olana address, if it does not exist, create it

  console.log("Creating associated token accounts...");
  const admin_token_a_account = await mint_a.getOrCreateAssociatedAccountInfo(
    adminWallet.publicKey
  );

  const admin_token_b_account = await mint_b.getOrCreateAssociatedAccountInfo(
    bobWallet.publicKey
  );

  //get the token account of the bobWallet Solana address, if it does not exist, create it
  console.log("Creating associated token accounts...");
  const bob_token_a_account = await mint_a.getOrCreateAssociatedAccountInfo(
    adminWallet.publicKey
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
    adminWallet.publicKey,
    [],
    1000000000
  );

  console.log("Minting token_a to bobTokenAccount...");

  // mint a token a into bob
  await mint_a.mintTo(
    bob_token_a_account.address,
    bobWallet.publicKey,
    [],
    LAMPORTS_PER_SOL
  );

  // Now bob can transfer token_a for token_b using this exchange booth!
  console.log("Successfully minted tokens :)");

  return [
    mint_a,
    mint_b,
    admin_token_a_account,
    admin_token_b_account,
    bob_token_a_account,
  ];
};

const initializeVaults = async (
  connection: Connection,
  adminWallet: Keypair,
  mint_a: Token,
  mint_b: Token,
  eb_pda: PublicKey
) => {
  // get the two vaults:
  const vault_a_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_a.publicKey,
    eb_pda,
    true
  );
  const vault_b_key = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_b.publicKey,
    eb_pda,
    true
  );

  const vault_a_account_ix = await Token.createAssociatedTokenAccountInstruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_a.publicKey,
    vault_a_key,
    eb_pda,
    adminWallet.publicKey
  );

  const vault_b_account_ix = await Token.createAssociatedTokenAccountInstruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint_b.publicKey,
    vault_b_key,
    eb_pda,
    adminWallet.publicKey
  );

  const tx = new Transaction();
  tx.add(vault_a_account_ix).add(vault_b_account_ix);

  let txid = await sendAndConfirmTransaction(connection, tx, [adminWallet], {
    skipPreflight: true,
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
  console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
};

const main = async () => {
  const connection = new Connection(CONNECTION);

  var adminWallet = Keypair.generate();

  var bobWallet = Keypair.generate(); // bob is the user
  // TODO: replace this with a phantom wallet!
  // Note: the admin IS the mint authority in this exercise

  // Creating the token and assigning the token to an acc
  await initialAirdrop(connection, adminWallet, bobWallet);

  const [
    mint_a,
    mint_b,
    admin_token_a_account,
    admin_token_b_account,
    bob_token_a_account,
  ] = await initTokens(connection, adminWallet, bobWallet);

  // After here we have the mints, we have the token accounts, all we need left are the vaults
  // In order to initialize the vaults, we need to get the PDA for the exchange booth.
  // This is because we need to set the PDA as the authority of the vaults

  let [ebPDA, ebBumpSeed] = await PublicKey.findProgramAddress(
    [
      Buffer.from("eb_pda"),
      adminWallet.publicKey.toBuffer(),
      (mint_a as Token).publicKey.toBuffer(),
      (mint_b as Token).publicKey.toBuffer(),
    ],
    ebProgramID
  );

  await initializeVaults(
    connection,
    adminWallet,
    mint_a as Token,
    mint_b as Token,
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
      pubkey: vault_aPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault_bPubkey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: ebPDA,
      isSigner: false,
      isWritable: true,
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
      pubkey: oraclePubkey,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];
};

main();
