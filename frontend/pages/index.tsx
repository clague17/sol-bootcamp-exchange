import Head from "next/head";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import twitterLogo from "../assets/twitter-logo.svg"; // statically load it from Nextjs. The image MUST be in public folder though
import Pokedex from "../assets/pokedex.png";
import TokenView from "../components/TokenView";
import ClassicShoppingCard from "../components/ClassicShoppingCard";
import GroudonSprite from "../assets/groudon-sprite-motion.gif";
import KyogreSprite from "../assets/kyogre-sprite-motion.gif";
import Pokemon from "../components/Pokemon";
import { Menu, Transition, Listbox } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/solid";

// Constants
const TWITTER_HANDLE = "clague17";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const PokemonList = [
  new Pokemon("Kyogre", KyogreSprite),
  new Pokemon("Groudon", GroudonSprite), // Just made this to populate the dropdown :)
];
// Design decision, the pokemon will be represented as 0, 1. Kyogre is 0, Groudon is 1

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const Feature = ({ title, desc, ...rest }) => (
  <div>
    <div className="flex flex-row space-x-5 px-5">
      <Image src={Pokedex} height={20} width={50} />
      <h1 className="text-7xl ml-5">{title}</h1>
    </div>
    <p className="text-[36px] mt-4 font-semibold">{desc}</p>
  </div>
);

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [pokemonA, setPokemonA] = useState(PokemonList[0]);
  const [pokemonB, setPokemonB] = useState(PokemonList[1]);

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
    return (
      <div className="flex bg-white">
        <ClassicShoppingCard />
      </div>
    );
  };

  return (
    // I could use kyogre-blue-light for the background or just plain black :'/ i wonder which looks better.
    <div className="flex flex-col items-center justify-center min-h-screen pt-14 px-20 bg-black overflow-hidden">
      <Head>
        <title>pokèDEX</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col items-center space-y-8 text-white">
        <Feature title={"pokèDEX"} desc={"Swap Pokèmon on Devnet"} />
        {/* {!walletAddress && renderNotConnectedContainer()} */}
      </div>
      <div className="flex space-y-8 content-center flex-col h-96 bg-kyogre-gray w-128 max-w-4xl rounded-2xl">
        <div className="h-fit-content w-[92%] bg-kyogre-blue-light mx-5 mt-5 rounded-2xl flex items-center">
          <div className="mx-3 my-5">
            {/* The DROPDOWN FOR SWITCHER A */}
            <Listbox value={pokemonA} onChange={setPokemonA}>
              <Listbox.Button>{<TokenView {...pokemonA} />}</Listbox.Button>
              <Listbox.Options>
                {PokemonList.filter(
                  (pokemon) => pokemon.name != pokemonA.name
                ).map((pokemon, idx) => (
                  <Listbox.Option key={idx} value={pokemon} disabled={false}>
                    <TokenView {...pokemon} />
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Listbox>
            <div
              id="dropdownLarge"
              className="hidden z-10 w-44 text-base list-none bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700 dark:divide-gray-600"
            >
              <ul className="py-1" aria-labelledby="dropdownLargeButton">
                <li>
                  <a
                    href="#"
                    className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                  >
                    Dashboard
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="h-[40%] w-[92%] bg-kyogre-red mx-5 rounded-2xl flex items-center">
          <TokenView {...pokemonB} />
        </div>
      </div>

      <footer className="flex items-center justify-center w-full bottom-0 p-0">
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
