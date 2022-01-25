import Head from "next/head";
import React, { useEffect, useState } from "react";
import PokedexBanner from "../assets/pokedex-header.png";
import Link from "next/link";
import Image from "next/image";
import twitterLogo from "../assets/twitter-logo.svg"; // statically load it from Nextjs. The image MUST be in public folder though
import TokenView from "../components/TokenView";
import GroudonSprite from "../assets/groudon-sprite-motion.gif";
import KyogreSprite from "../assets/kyogre-sprite-motion.gif";
import Pokemon from "../components/Pokemon";
import { PhantomProvider } from "../utils/phantom";
import toast, { Toaster } from "react-hot-toast";
// const admin = require("../../debug_utils/admin_wallet.json");
const admin = require("../../devnet_debug_utils/admin_wallet.json");

// const tokenAccountsData = require("../../debug_utils/init_token_accounts.json");
const tokenAccountsData = require("../../devnet_debug_utils/init_token_accounts.json");

import { Connection, clusterApiUrl, Keypair, PublicKey } from "@solana/web3.js";

import {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const TWITTER_HANDLE = "clague17";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const MINT_DECIMALS = 1000000;
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

const getProvider = (): PhantomProvider | undefined => {
  if (typeof window != "undefined" && "solana" in window) {
    const anyWindow: any = window;
    const provider = anyWindow.solana;
    if (provider.isPhantom) {
      return provider;
    }
  }
};

export default function FirstTime() {
  const provider = getProvider();
  //   const rpcHost = "http://127.0.0.1:8899/";
  const rpcHost = clusterApiUrl("devnet");

  // Create a new connection object
  const connection = new Connection(rpcHost!!);
  const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);

  const checkIfWalletIsConnected = async (): Promise<PhantomProvider | null> => {
    try {
      console.log("Check if wallet is connected");
      const { solana } = window as any;

      if (solana) {
        if (solana.isPhantom) {
          // try to connect here
          const response = await solana.connect({ onlyIfTrusted: true });
          let walletAddress = response.publicKey as PublicKey;
          setWalletAddress(walletAddress);
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

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const tryMintGroudon = async () => {
    console.log("Tryna mint 5 kyogre");

    let mintSigner: Keypair = Keypair.fromSecretKey(Uint8Array.from(admin));

    let kyogreMintAddress: string = PokemonList[0].tokenAddress;
    let kyogreMint = new Token(
      connection,
      new PublicKey(kyogreMintAddress),
      TOKEN_PROGRAM_ID,
      mintSigner
    );

    const userGroudonTokenAccount = await kyogreMint.getOrCreateAssociatedAccountInfo(
      provider!!.publicKey as PublicKey
    );

    toast.promise(
      kyogreMint.mintTo(
        userGroudonTokenAccount.address,
        mintSigner,
        [mintSigner],
        5 * MINT_DECIMALS
      ),
      {
        success: "Success! Enjoy your 5 Kyogre!",
        error: "Error",
        loading: "Loading Transaction ...",
      },
      {
        success: {
          duration: 5000, // overwrite from the standard 2000
        },
      }
    );
  };

  const connectWallet = async () => {
    const { solana } = window as any; // Have to do this cast, otherwise the typing complains about solana not existing as a property of window :'(

    if (solana) {
      const response = await solana.connect();
      setWalletAddress(response.publicKey);
    }
  };

  const renderConnectWalletBtn = () => {
    return <button onClick={connectWallet}>Connect Wallet on Devnet</button>;
  };

  const renderMintGroudonBtn = () => {
    return (
      <button onClick={tryMintGroudon}>
        <p>Mint Groudon</p>
      </button>
    );
  };

  return (
    <div>
      <div>
        <Toaster
          position="top-right"
          toastOptions={{
            className: "bg-gradient-radial from-blue-600 to-blue-900",
          }}
        />
      </div>
      <div className="relative flex-col items-center justify-between min-h-screen sm:pt-14 px-5 md:px-20 bg-black overflow-hidden">
        <Head>
          <title>pokèDEX</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="flex flex-col items-center space-y-8 text-white">
          <Image src={PokedexBanner} />
        </div>
        <div className="relative group justify-center mt-10">
          <div className=" to-kyogre-red from-kyogre-blue-light absolute mx-auto blur-xl -inset-1 bg-gradient-to-r w-full md:w-132 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-200"></div>
          <div className="relative group justify-center mt-10">
            <div className="relative mx-auto w-full md:w-132 space-y-3 flex-col bg-gradient-radial from-blue-600 to-blue-900 rounded-2xl text-white">
              <div className="flex flex-col">
                <div className="flex">
                  <div className="relative h-4 mt-3 ml-3">
                    <Image
                      className=""
                      src={PokemonList[0].image}
                      height={100}
                      width={100}
                    />
                  </div>
                  <div className="text-center">
                    <h1 className="text-5xl py-5">Welcome to the pokéDEX</h1>
                  </div>
                  <div className="relative h-4 mt-3 ml-3">
                    <Image
                      className=""
                      src={PokemonList[1].image}
                      height={100}
                      width={100}
                    />
                  </div>
                </div>
                <div className="text-center mx-4">
                  <p className="text-3xl my-2">
                    Just a few things before we can get you started.
                  </p>
                  <p className="text-2xl my-5">
                    First, connect your wallet and mint a few Groudons on devnet
                  </p>
                  <p className="text-xl">
                    {" "}
                    This was just a toy project for me to build a fullstack DEX!
                    There's a lot of improvements to be made, but at least it's
                    fun to play with. Checkout the
                    <a
                      className="text-red-400"
                      href="https://github.com/clague17/sol-bootcamp-exchange"
                    >
                      {"  "}
                      repo{" "}
                    </a>
                    and DM me on twitter if you have any feedback!
                  </p>
                </div>

                <div className="flex justify-center py-6">
                  <div className="flex text-white bg-gradient-radial from-kyogre-blue-dark to-kyogre-blue-light mx-4 p-3 rounded-xl">
                    <button>
                      <Link href="/">
                        <p>I'm ready to start swapping!</p>
                      </Link>
                    </button>
                  </div>
                  <div className="flex text-white bg-gradient-radial from-kyogre-blue-dark to-kyogre-blue-light px-3 mx-4 rounded-xl">
                    {walletAddress && renderMintGroudonBtn()}
                    {!walletAddress && renderConnectWalletBtn()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex mt-10 items-center justify-center w-full bottom-0 left-0">
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
