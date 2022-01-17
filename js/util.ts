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

const adminBytes = require("./admin_wallet.json");
const bobBytes = require("./bob_wallet.json");

// Hardcoding this here because I want to be able to keep the same admin across testing.
// OBVIOUSLY DO NOT DO THIS!
const Admin = Keypair.fromSecretKey(Uint8Array.from(adminBytes));
const Bob = Keypair.fromSecretKey(Uint8Array.from(bobBytes));

export { Admin, Bob };
