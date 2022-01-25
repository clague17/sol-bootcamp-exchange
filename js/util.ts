import { Connection, Keypair, Commitment, PublicKey } from "@solana/web3.js";

import { TOKEN_PROGRAM_ID, MintLayout } from "@solana/spl-token";

const adminBytes = require("../debug_utils/admin_wallet.json");
const bobBytes = require("../debug_utils/bob_wallet.json");

const devnetAdminBytes = require("../devnet_debug_utils/admin_wallet.json");
const devnetBobBytes = require("../devnet_debug_utils/bob_wallet.json");

// Hardcoding this here because I want to be able to keep the same admin across testing.
// OBVIOUSLY DO NOT DO THIS!
const Admin = Keypair.fromSecretKey(Uint8Array.from(adminBytes));
const Bob = Keypair.fromSecretKey(Uint8Array.from(bobBytes));
const DevnetAdmin = Keypair.fromSecretKey(Uint8Array.from(devnetAdminBytes));
const DevnetBob = Keypair.fromSecretKey(Uint8Array.from(devnetBobBytes));
export { Admin, Bob, DevnetAdmin, DevnetBob };

import {
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TokenInvalidAccountSizeError,
} from "./error";

/* Shamelessly taken from
 * https://github.com/solana-labs/solana-program-library/blob/14952a75ba6cecf3ba66a412a2fca6afd8f6ce52/token/ts/src/state/mint.ts
 * mostly because I just couldn't figure out how to import the function :'(
 */

interface Mint {
  /** Address of the mint */
  address: PublicKey;
  /**
   * Optional authority used to mint new tokens. The mint authority may only be provided during mint creation.
   * If no mint authority is present then the mint has a fixed supply and no further tokens may be minted.
   */
  mintAuthority: PublicKey | null;
  /** Total supply of tokens */
  supply: bigint;
  /** Number of base 10 digits to the right of the decimal place */
  decimals: number;
  /** Is this mint initialized */
  isInitialized: boolean;
  /** Optional authority to freeze token accounts */
  freezeAuthority: PublicKey | null;
}

/** Byte length of a mint */
export const MINT_SIZE = MintLayout.span;

export async function getMint(
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID
): Promise<Mint> {
  const info = await connection.getAccountInfo(address);
  if (!info) throw new TokenAccountNotFoundError();
  if (!info.owner.equals(programId)) throw new TokenInvalidAccountOwnerError();
  if (info.data.length != MINT_SIZE) throw new TokenInvalidAccountSizeError();

  const rawMint = MintLayout.decode(info.data);

  return {
    address,
    mintAuthority: rawMint.mintAuthorityOption ? rawMint.mintAuthority : null,
    supply: rawMint.supply,
    decimals: rawMint.decimals,
    isInitialized: rawMint.isInitialized,
    freezeAuthority: rawMint.freezeAuthorityOption
      ? rawMint.freezeAuthority
      : null,
  };
}
