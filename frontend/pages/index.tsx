import Head from "next/head";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import twitterLogo from "../assets/twitter-logo.svg"; // statically load it from Nextjs. The image MUST be in public folder though
import Pokedex from "../assets/pokedex.png";

// Constants
const TWITTER_HANDLE = "clague17";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const Feature = ({ title, desc, ...rest }) => (
  <div>
    <div className="flex flex-row space-x-5">
      <Image src={Pokedex} height={20} width={100} />
      <p className="text-[72px] ml-5">{title}</p>
    </div>
    <p className="text-[36px] mt-4">{desc}</p>
  </div>
);

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);

  /*
   * Declare your function
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          // try to connect here
          const response = await solana.connect({ onlyIfTrusted: true });
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window;

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
    return;
    <div className="flex bg-white"></div>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-14 bg-black overflow-hidden">
      <Head>
        <title>pokèDEX</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col items-center space-y-8 text-white">
        <Feature title={"pokèDEX"} desc={"Swap Pokèmon on Devnet"} />
        {/* {!walletAddress && renderNotConnectedContainer()} */}
      </div>
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center"></main>

      <footer className="flex items-center justify-center w-full bottom-0">
        <a
          className="flex items-center justify-center text-white font-bold"
          href={TWITTER_LINK}
          target="_blank"
          rel="noreferrer"
        >
          <Image alt="Twitter Logo" width={35} src={twitterLogo} />
          {`built by @${TWITTER_HANDLE}`}
        </a>
      </footer>
    </div>
  );
}
