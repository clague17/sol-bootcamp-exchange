const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} = require("@solana/web3.js");
import * as splToken from "@solana/spl-token";

const Main = async () => {
  let devnet = web3.clusterApiUrl("devnet");
  let localhost = "http://127.0.0.1:8899";

  var connection = new Connection(localhost);

  var mintOwner = Keypair.generate();

  var aMint = new PublicKey("solpyth token address"); // the solpyth token

  var bob = Keypair.generate(); // bob is the user
  // TODO: replace this with a phantom wallet!

  var admin = Keypair.generate();

  const idx = Buffer.from(new Uint8Array([0]));
  const messageLen = Buffer.from(
    new Uint8Array(new BN(echo.length).toArray("le", 4))
  );
  const message = Buffer.from(echo, "ascii");

  // Creating the token and assigning the token to an acc fromWallet
  new splToken.Token();
  var aToken = new splToken.Token(
    connection,
    aMint,
    splToken.TOKEN_PROGRAM_ID,
    mintOwner
  );

  var bToken = new splToken.Token(
    connection,
    bMint,
    splToken.TOKEN_PROGRAM_ID,
    mintOwner
  );
};

const initToken = async () => {
  var myToken = new splToken.Token(
    connection,
    myMint,
    splToken.TOKEN_PROGRAM_ID,
    fromWallet
  );
};

// Initialize the user's token account
const initUser = async () => {
  let devnet = web3.clusterApiUrl("devnet");
  let localhost = "http://127.0.0.1:8899";

  var connection = new Connection(localhost);

  var mintOwner = Keypair.generate();

  var aMint = new PublicKey("solpyth token address"); // the solpyth token

  var fromTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
    fromWallet.publicKey
  );
};
