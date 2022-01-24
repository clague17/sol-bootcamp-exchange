import Head from "next/head";
import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import twitterLogo from "../assets/twitter-logo.svg"; // statically load it from Nextjs. The image MUST be in public folder though
import TokenView from "../components/TokenView";
import GroudonSprite from "../assets/groudon-sprite-motion.gif";
import KyogreSprite from "../assets/kyogre-sprite-motion.gif";
import Pokemon from "../components/Pokemon";
import { Transition, Listbox } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/solid";
import PokedexBanner from "../assets/pokedex-header.png";
import TradeButton from "../assets/trade.png";
import SwapButton from "../assets/swap.png";
import { PhantomProvider } from "../utils/phantom";
import toast, { Toaster } from "react-hot-toast";
const { BN } = require("bn.js");
const admin = require("../../debug_utils/admin_wallet.json");
const tokenAccountsData = require("../../debug_utils/init_token_accounts.json");
const oracleAccountData = require("../../debug_utils/init_oracle_account.json");
const a_to_b_ratio = 1.0 / 2; // 2 A for 3 B! b is .33 less valuable

// Solana imports!
import {
  Connection,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
  Keypair,
  PublicKey,
} from "@solana/web3.js";

import {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// config constants for ease of use:
const ebPDA = new PublicKey("pzsLHGDLqpgQ21ezdTQkgiGgUxUyhxkqkk87UY5RgBr"); // The exchange booth pda
const mint_a_pubkey = new PublicKey(tokenAccountsData.mint_a as string);
const mint_b_pubkey = new PublicKey(tokenAccountsData.mint_b as string);
const oracleKey = new PublicKey(
  oracleAccountData.oracle_buffer_address as string
);
const EB_PROGRAM_ID = new PublicKey(
  "29e799E2EERqux5qDh5YHzXNdTKa3tBbjXSMHx1g5DL2"
);
// TODO: host these vars in an environment variable or from a third party that can be easily accessed headlessly without needing to completely redploy the frontend. IN case we want to use a different oracle for pricing/etc

import { findAssociatedTokenAddress } from "../utils/tokens";

// Constants
const TWITTER_HANDLE = "clague17";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const PokemonList = [
  new Pokemon(
    "Kyogre",
    KyogreSprite,
    tokenAccountsData.mint_a as string, // this is the mint address
    1 // This is the price relative to the other one
  ),
  new Pokemon(
    "Groudon",
    GroudonSprite,
    tokenAccountsData.mint_b as string, // this is the mint
    2 // This is the price relative to the other one
  ),
];

// Design decision, there's nothing inherently groudon or kyogre about it. I just chose two pokemon I like and associated them with the tokens semantically. Solana knows nothing about pokemon or kyogre, groudon, etc.
// Design decision, the pokemon will be represented as 0, 1. Kyogre is 0, Groudon is 1
// On the above, decided to just make Pokemon objects to keep all the info together :)

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

// const Feature = ({ title, desc, ...rest }) => (
//   <div>
//     <div className="flex flex-row space-x-5 px-5">
//       <Image src={Pokedex} height={20} width={50} />
//       <h1 className="text-7xl ml-5">{title}</h1>
//     </div>
//     <p className="text-[36px] mt-4 font-semibold">{desc}</p>
//   </div>
// );

const getProvider = (): PhantomProvider | undefined => {
  if (typeof window != "undefined" && "solana" in window) {
    const anyWindow: any = window;
    const provider = anyWindow.solana;
    if (provider.isPhantom) {
      return provider;
    }
  }
};

export default function Home() {
  const provider = getProvider();
  const rpcHost = "http://127.0.0.1:8899/";
  // Create a new connection object
  const connection = new Connection(rpcHost!!);
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useCallback(
    (log: string) => setLogs((logs) => [...logs, "> " + log]),
    []
  );
  const [, setConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
  const [pokemonA, setPokemonA] = useState(PokemonList[0]);
  const [pokemonB, setPokemonB] = useState(PokemonList[1]);
  const [isExchangeButtonEnabled, setIsExchangeButtonEnabled] = useState(false);
  const [userMaxAmountA, setUserMaxAmountA] = useState(0);
  const [amountA, setAmountA] = useState(0);
  const [amountB, setAmountB] = useState(0);

  const swapTradeDirection = () => {
    setPokemonA(pokemonB);
    setAmountA(amountB);

    // Swap B
    setPokemonB(pokemonA);
    setAmountB(amountA);
    checkTokenBalance(walletAddress!!); // We have to check tokenBalance again for this new token
  };

  const checkIfWalletIsConnected = async (): Promise<PhantomProvider | null> => {
    try {
      const { solana } = window as any;

      if (solana) {
        if (solana.isPhantom) {
          // try to connect here
          const response = await solana.connect({ onlyIfTrusted: true });
          let walletAddress = response.publicKey as PublicKey;
          setWalletAddress(walletAddress);
          initialCheckTokenBalance(walletAddress);
          return solana as PhantomProvider;
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  };

  // TODO fix this hacky. This function and the function below should really just be the same thing, eventually xD
  // SO turns out that this has to check pokemonB, because of the way I'm calling this function in the swap, PokemonB will become pokemonA on re-render after setting the new state, BUT we need to check the token balance before that happens.
  const checkTokenBalance = async (walletAddress: PublicKey) => {
    let connection = getConnection();

    let ata = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(pokemonB.tokenAddress),
      new PublicKey(walletAddress.toString())
    );

    let ata_ai = await connection.getAccountInfo(ata);

    if (!ata_ai) {
      console.log(
        `Oopsie, looks like account ${walletAddress.toString()} doesn't have a tokenAccount for the ${
          pokemonB.name
        } token with address ${pokemonB.tokenAddress}`
      );
      // Toast
      setUserMaxAmountA(-1);
      setIsExchangeButtonEnabled(false);
      return;
      // if we're here then the user has never seen this token before. They can't even use the app lol, we should point them to a faucet or something so they can actually use the tool
    }

    // let userBBalance = await connection.getTokenAccountBalance(ata);
    let userBBalance = await connection.getTokenAccountBalance(ata);

    setUserMaxAmountA(userBBalance.value.uiAmount!!); // In this case, we want to set amount A for the B balance, for the reasons above

    setIsExchangeButtonEnabled(userBBalance.value.uiAmount!! > 0);
  };

  const initialCheckTokenBalance = async (walletAddress: PublicKey) => {
    let connection = getConnection();

    let ata = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(pokemonB.tokenAddress),
      new PublicKey(walletAddress.toString())
    );

    let ata_ai = await connection.getAccountInfo(ata);

    if (!ata_ai) {
      console.log(
        `Oopsie, looks like account ${walletAddress.toString()} doesn't have a tokenAccount for the ${
          pokemonB.name
        } token with address ${pokemonB.tokenAddress}`
      );
      // Toast
      setUserMaxAmountA(-1);
      setIsExchangeButtonEnabled(false);
      return;
      // if we're here then the user has never seen this token before. They can't even use the app lol, we should point them to a faucet or something so they can actually use the tool
    }

    // let userBBalance = await connection.getTokenAccountBalance(ata);
    let userBBalance = await connection.getTokenAccountBalance(ata);

    setUserMaxAmountA(userBBalance.value.uiAmount!!); // In this case, we want to set amount A for the B balance, for the reasons above

    setIsExchangeButtonEnabled(userBBalance.value.uiAmount!! > 0);
  };

  const maybeExchangeTokens = async (swapAmount: number) => {
    if (!provider?.publicKey) return;
    let connection = getConnection();
  };

  const tryExchangeTokens = async (swapAmount: number) => {
    if (!provider?.publicKey) return;
    let connection = getConnection();
    let mintSigner: Keypair = Keypair.fromSecretKey(Uint8Array.from(admin)); // This is only necessary to get the mints, you could argue that's not really necessary to perform the transaction

    let fromTokenMintAddress: string = pokemonA.tokenAddress;
    let toTokenMintAddress: string = pokemonB.tokenAddress;

    let fromTokenMint = new Token(
      connection,
      new PublicKey(fromTokenMintAddress),
      TOKEN_PROGRAM_ID,
      mintSigner
    );

    let toTokenMint = new Token(
      connection,
      new PublicKey(toTokenMintAddress),
      TOKEN_PROGRAM_ID,
      mintSigner
    );

    const fromTokenAccount = await fromTokenMint.getOrCreateAssociatedAccountInfo(
      provider.publicKey as PublicKey
    );

    const toTokenAccount = await toTokenMint.getOrCreateAssociatedAccountInfo(
      provider.publicKey as PublicKey
    );

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

    let exchangeIdx = Buffer.from(new Uint8Array([3]));
    // let's do some error checking to make sure swapAmount is not more than the person can do - FIXEd by the UI :)
    const swapAmountBuff = Buffer.from(
      new Uint8Array(new BN(swapAmount * 10 ** 6).toArray("le", 8))
    );
    let exchangeIx = new TransactionInstruction({
      keys: [
        { pubkey: ebPDA, isSigner: false, isWritable: true },
        { pubkey: vault_a_key, isSigner: false, isWritable: true },
        { pubkey: vault_b_key, isSigner: false, isWritable: true },
        { pubkey: provider?.publicKey!!, isSigner: true, isWritable: false },
        { pubkey: fromTokenAccount.address, isSigner: false, isWritable: true },
        { pubkey: toTokenAccount.address, isSigner: false, isWritable: true },
        { pubkey: mint_a_pubkey, isSigner: false, isWritable: false },
        { pubkey: mint_b_pubkey, isSigner: false, isWritable: false },
        { pubkey: oracleKey, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: EB_PROGRAM_ID,
      data: Buffer.concat([exchangeIdx, swapAmountBuff]),
    });
    console.log("Trying to send transaction!");

    let exchangeTx = new Transaction();
    addLog("Getting recent blockhash");
    const anyTransaction: any = exchangeTx;
    anyTransaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash;
    exchangeTx.add(exchangeIx);
    exchangeTx.feePayer = provider?.publicKey;
    let signed = await provider?.signTransaction(exchangeTx);
    addLog("Got signature, submitting transaction");
    let signature = await connection.sendRawTransaction(signed!!.serialize());
    addLog("Submitted transaction " + signature + ", awaiting confirmation");
    toast.promise(connection.confirmTransaction(signature), {
      success: "Success!",
      error: "Error",
      loading: "Loading Confirmation",
    });
    // success toast Here!
    checkTokenBalance(walletAddress!!);
    addLog("Transaction " + signature + " confirmed");
    // setUserMaxAmountA(fromTokenAccountBalance.value.uiAmount!!);
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window as any; // Have to do this cast, otherwise the typing complains about solana not existing as a property of window :'(

    if (solana) {
      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => {
    return (
      <div id="renderNotConnectedContainer" className="flex flex-col">
        <img
          className="h-[300px] w-[300px] object-cover rounded-xl max-w-full drop-shadow-lg"
          src={
            "https://media2.giphy.com/media/fSvqyvXn1M3btN8sDh/giphy.gif?cid=ecf05e47f3cmli4l64unl59820kxmcaocd0855t7s1hfsk5v&rid=giphy.gif&ct=g"
          }
        />
        <button
          className="cta-button connect-wallet-button my-[50px] bg-[length:200%_200%]"
          onClick={connectWallet}
        >
          Connect Wallet on Devnet
        </button>
      </div>
    );
  };

  const renderSwapContainer = () => {
    return (
      <div className="relative group justify-center mt-10">
        <div
          className={`${
            pokemonA.name == PokemonList[0].name
              ? "to-kyogre-blue-light"
              : "to-kyogre-red"
          } ${
            pokemonB.name == PokemonList[0].name
              ? "from-kyogre-blue-light"
              : "from-kyogre-red"
          } absolute mx-auto blur-xl -inset-1 bg-gradient-to-t  w-full md:w-132 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-200`}
        ></div>
        <div className="relative mx-auto w-full md:w-132 space-y-3 flex-col bg-gradient-radial from-blue-600 to-blue-900 rounded-2xl">
          <div className="flex md:mx-5 max-h-[163px] py-5 rounded-2xl justify-between">
            {/* The DROPDOWN FOR SWITCHER A */}
            <Listbox
              as="div"
              className="w-fit"
              value={pokemonA}
              onChange={setPokemonA}
            >
              {({ open }) => (
                <>
                  <Listbox.Button
                    className={`${
                      pokemonA.name == PokemonList[0].name
                        ? "from-blue-300 to-kyogre-blue-light"
                        : "from-red-300 to-kyogre-red"
                    } rounded-lg bg-gradient-radial hover:bg-gradient-radial flex items-center mx-2 md:mx-5 `}
                  >
                    <TokenView {...pokemonA} />
                    <ChevronDownIcon className="h-12" />
                  </Listbox.Button>
                  <Transition
                    show={open}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-200"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options static>
                      {PokemonList.filter(
                        (pokemon) => pokemon.name != pokemonA.name
                      ).map((pokemon, idx) => (
                        <Listbox.Option
                          key={idx}
                          value={pokemon}
                          disabled={false}
                          as="div" // This got rid of the warning "li cannot appear as descendant of li"
                        >
                          {({ active, selected }) => (
                            <li
                              className={`${
                                active
                                  ? "bg-blue-900 text-white rounded-b-lg"
                                  : "bg-kyogre-red text-black rounded-b-lg"
                              } cursor-default relative z-40 select-none py-2 mx-2 md:mx-5 pl-6 pr-4 `}
                            >
                              {selected}
                              <TokenView {...pokemon} />
                            </li>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </>
              )}
            </Listbox>
            {/* The Number input :) */}
            <div
              className={`${
                userMaxAmountA > 0 ? "" : "justify-center"
              } flex flex-col`}
            >
              {userMaxAmountA > 0 && (
                <label
                  htmlFor="amountA"
                  className="flex text-md justify-end font-medium text-kyogre-gray mx-3 md:mx-6 py-2 "
                >
                  <button
                    onClick={() => {
                      setAmountA(userMaxAmountA);
                      let b_amount =
                        userMaxAmountA * (pokemonB.price / pokemonA.price);
                      setAmountB(b_amount);
                    }}
                  >
                    Max:{" "}
                    <span className="underline underline-offset-2 hover:text-white">
                      {userMaxAmountA}
                    </span>
                  </button>
                </label>
              )}
              <input
                type="number"
                id="amountA"
                className="amount-input"
                placeholder="0"
                value={amountA ? amountA : ""}
                onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                  let userInput = +ev.target.value;
                  setAmountA(userInput); // Apparently + is the unary operator and is a cooler version of parseInt xD https://stackoverflow.com/questions/14667713/how-to-convert-a-string-to-number-in-typescript
                  // based on the oracle price, set the other token's amount necessary for this amount
                  let b_amount = userInput * (pokemonB.price / pokemonA.price);
                  let canMakeTrade = userInput <= userMaxAmountA;
                  if (canMakeTrade) {
                    setAmountB(b_amount);
                  }
                  // setIsExchangeButtonEnabled(canMakeTrade);
                }}
                required
              />
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => swapTradeDirection()}
              className="flex w-fit mx-10 md:mx-16"
            >
              <Image height={100} width={100} src={TradeButton} />
            </button>
            <div className="flex flex-col justify-center">
              <button
                onClick={() => tryExchangeTokens(amountA)}
                disabled={!isExchangeButtonEnabled}
                className={`${
                  isExchangeButtonEnabled
                    ? "bg-swap-yellow-dark hover:bg-swap-yellow-light"
                    : "bg-kyogre-gray"
                } w-32 mx-4 md:mx-10  py-2 rounded-full md:w-fit md:text-xl md:px-10`}
              >
                Exchange
              </button>
            </div>
          </div>
          <div className="flex md:mx-5 max-h-[163px] py-5 rounded-2xl justify-between">
            {/* The DROPDOWN FOR SWITCHER A */}
            <Listbox
              as="div"
              className="w-fit"
              value={pokemonB}
              onChange={setPokemonB}
            >
              {({ open }) => (
                <>
                  <Listbox.Button
                    className={`${
                      pokemonB.name == PokemonList[0].name
                        ? "from-blue-300 to-kyogre-blue-light"
                        : "from-red-300 to-kyogre-red"
                    } rounded-lg bg-gradient-radial hover:bg-gradient-radial flex items-center mx-2 md:mx-5 `}
                  >
                    <TokenView {...pokemonB} />
                    <ChevronDownIcon className="h-12" />
                  </Listbox.Button>
                  <Transition
                    show={open}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-200"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options>
                      {PokemonList.filter(
                        (pokemon) => pokemon.name != pokemonB.name
                      ).map((pokemon, idx) => (
                        <Listbox.Option
                          key={idx}
                          value={pokemon}
                          disabled={false}
                          as="div"
                        >
                          {({ active, selected }) => (
                            <li
                              className={`${
                                active
                                  ? "bg-blue-900 text-white rounded-b-lg"
                                  : "bg-kyogre-red text-black rounded-b-lg"
                              } cursor-default relative z-40 select-none py-2 mx-2 md:mx-5 pl-6 pr-4 `}
                            >
                              {selected}
                              <TokenView {...pokemon} />
                            </li>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </>
              )}
            </Listbox>
            {/* The Number input :) */}
            <div className="flex">
              <input
                type="number"
                min="0"
                id="amountB"
                className="amount-input"
                placeholder="0"
                value={amountB ? amountB : ""}
                onChange={(ev: React.ChangeEvent<HTMLInputElement>): void => {
                  let userInput = +ev.target.value;
                  setAmountB(userInput); // Apparently + is the unary operator and is a cooler version of parseInt xD https://stackoverflow.com/questions/14667713/how-to-convert-a-string-to-number-in-typescript
                  // based on the oracle price, set the other token's amount necessary for this amount
                  let a_amount =
                    userInput * ((1.0 * pokemonA.price) / pokemonB.price);
                  setAmountA(a_amount);
                }}
                required
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  /*
   * This effect ties the exchange button to whenever the amountA changes, making sure that if the amount ever exceeds the maximum of the token account then the button will be greyed out :)
   */
  useEffect(() => {
    setIsExchangeButtonEnabled(amountA <= userMaxAmountA);
  }, [amountA]);

  const getConnection = () => {
    // const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST; // This is only for the env variable once deployed
    return connection;
  };

  return (
    // I could use kyogre-blue-light for the background or just plain black :'/ i wonder which looks better.
    // The outer container NEEDS to be relative!
    <div>
      <div>
        <Toaster />
      </div>
      <div className="relative flex-col items-center justify-between min-h-screen sm:pt-14 px-5 md:px-20 bg-black overflow-hidden">
        <Head>
          <title>pokèDEX</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="flex flex-col items-center space-y-8 text-white">
          <Image src={PokedexBanner} />
          {!walletAddress && renderNotConnectedContainer()}
        </div>
        {walletAddress && renderSwapContainer()}
        <footer className="flex mt-10 items-center justify-center w-full fixed bottom-0 left-0">
          <a
            className="flex items-center justify-center text-white font-bold"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >
            <Image
              alt="Twitter Logo"
              width={35}
              height={35}
              src={twitterLogo}
            />
            {`built by @${TWITTER_HANDLE}`}
          </a>
        </footer>
      </div>
    </div>
  );
}
