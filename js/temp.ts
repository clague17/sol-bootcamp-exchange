import { writeFile, readFile } from "fs/promises";

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

import { getMint } from "@solana/spl-token";

const main = async () => {
  const LOCAL_NET = "http://127.0.0.1:8899";
  const DEV_NET = clusterApiUrl("devnet");
  const CONNECTION = LOCAL_NET;
  let connection = new Connection(CONNECTION);
  var data = {
    coin_a: "litty",
  };

  const filePath = "../debug_utils/token_a.json";

  writeFile(filePath, JSON.stringify(data))
    .then(() => console.log(`Wrote Token Accounts to ${filePath}\n`))
    .catch((err) =>
      console.log(`Error writing Token Accounts to ${filePath}\n`)
    );
  let { cofsdain_a } = await readFile(filePath, "utf8").then((res) => {
    let token_data = JSON.parse(res);
    return token_data;
  });

  let mint_a_pubkey = "APdGmwp9hdHoKdGepRDMox1EKKKf9qUg3hwYg2SCLvhU";
};

main();
