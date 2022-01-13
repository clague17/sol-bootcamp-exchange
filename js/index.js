const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  clusterApiUrl,
  PublicKey,
  TransactionInstruction,
} = require("@solana/web3.js");
const { Token, TOKEN_PROGRAM_ID, MINT_LEN } = require("@solana/spl-token");

const SPL_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

const main = async () => {
  var mintOwner = Keypair.generate();

  var bob = Keypair.generate(); // bob is the user
  // TODO: replace this with a phantom wallet!

  var admin = Keypair.generate();

  // Creating the token and assigning the token to an acc

  const [aToken, bToken] = await initTokens().then((aToken, bToken) => [
    aToken,
    bToken,
  ]);
};

const initTokens = async () => {
  let devnet = clusterApiUrl("devnet");
  let localhost = "http://127.0.0.1:8899";

  var connection = new Connection(localhost);

  var mintOwner = Keypair.generate(); // This is also the feepayer
  console.log("Requesting Airdrop of 1 SOL...");
  let placeholder = await connection.requestAirdrop(
    mintOwner.publicKey,
    10000000
  ); // fund them
  await connection.confirmTransaction(placeholder);
  console.log("Airdrop received");

  var aToken = new Token(
    connection,
    mintOwner.publicKey,
    TOKEN_PROGRAM_ID,
    mintOwner
  ); // create a token

  console.log("Creating Token A and Mint A...");

  aMint = await Token.createMint(
    connection,
    mintOwner,
    mintOwner.publicKey,
    null,
    9,
    TOKEN_PROGRAM_ID
  ).then((res) => res);

  console.log("Creating Token B and mint B...");

  var bToken = new Token(
    connection,
    mintOwner.publicKey,
    TOKEN_PROGRAM_ID,
    mintOwner
  ); // create b token

  bMint = await Token.createMint(
    connection,
    mintOwner,
    mintOwner.publicKey,
    null,
    9,
    TOKEN_PROGRAM_ID
  ).then((res) => res);

  console.log(
    `aMint: ${aMint.publicKey.toBase58()}, bMint: ${bMint.publicKey.toBase58()}`
  );

  return aToken, bToken;
};

// Initialize the user's token account
const initUser = async (aToken, bToken) => {
  let devnet = clusterApiUrl("devnet");
  let localhost = "http://127.0.0.1:8899";

  let userWallet = new Keypair();

  var connection = new Connection(localhost);

  var mintOwner = Keypair.generate();

  var user_a_token_acc = await aToken.getOrCreateAssociatedAccountInfo(
    userWallet.publicKey,
    mintOwner
  );

  console.log("User aToken account!", user_a_token_acc);

  var user_b_token_acc = await bToken.getOrCreateAssociatedAccountInfo(
    userWallet.publicKey
  );

  console.log("User bToken account!", user_b_token_acc);
};

main();
