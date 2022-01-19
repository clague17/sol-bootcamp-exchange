import Head from "next/head";
import React, { useEffect, useState } from "react";
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

// Solana imports!
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

// Constants
const TWITTER_HANDLE = "clague17";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const PokemonList = [
  new Pokemon(
    "Kyogre",
    KyogreSprite,
    "3mG9t8BcKrPfWiwvjqwXAsHvGpoP8AU2yNp6fNTTLdFB" // this is the mint
  ),
  new Pokemon(
    "Groudon",
    GroudonSprite,
    "FVXX5Ym6DChrLJPaZLe7cpJZ63hjNLt5JFHMx5GXhB53" // this is the mint
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

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [pokemonA, setPokemonA] = useState(PokemonList[0]);
  const [pokemonB, setPokemonB] = useState(PokemonList[1]);
  const [isSwapDirection, setIsSwapDirection] = useState(true); // Neccessary for a transition
  const [amountA, setAmountA] = useState(0);
  const [amountB, setAmountB] = useState(0);

  const swapTradeDirection = () => {
    console.log("We're swapping directions");
    setIsSwapDirection(!isSwapDirection);
    // Swap A
    setPokemonA(pokemonB);
    setAmountA(amountB);

    // Swap B
    setPokemonB(pokemonA);
    setAmountB(amountA);
  };

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window as any;

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
      <div className="flex justify-center">
        <div className="flex w-132 space-y-3 flex-col bg-kyogre-blue-light rounded-2xl">
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
                  <Listbox.Button className="rounded-lg bg-white hover:bg-violet-400 flex items-center mx-2 md:mx-5">
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
                        >
                          {({ active, selected }) => (
                            <li
                              className={`${
                                active
                                  ? "bg-blue-500 text-white rounded-b-lg"
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
                id="amountA"
                className="amount-input"
                placeholder="0"
                value={amountA}
                onChange={
                  (ev: React.ChangeEvent<HTMLInputElement>): void =>
                    setAmountA(+ev.target.value) // Apparently + is the unary operator and is a cooler version of parseInt xD https://stackoverflow.com/questions/14667713/how-to-convert-a-string-to-number-in-typescript
                }
                required
              />
            </div>
          </div>
          <button
            onClick={() => swapTradeDirection()}
            className="flex w-fit mx-10 md:mx-16"
          >
            <Transition
              show={isShowing}
              enter="transition-opacity duration-75"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            />
            <Image height={100} width={100} src={TradeButton} />
          </button>
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
                  <Listbox.Button className="rounded-lg bg-white hover:bg-violet-400 flex items-center mx-2 md:mx-5">
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
                        >
                          {({ active, selected }) => (
                            <li
                              className={`${
                                active
                                  ? "bg-blue-500 text-white rounded-b-lg"
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
                value={amountA}
                onChange={
                  (ev: React.ChangeEvent<HTMLInputElement>): void =>
                    setAmountB(+ev.target.value) // Apparently + is the unary operator and is a cooler version of parseInt xD https://stackoverflow.com/questions/14667713/how-to-convert-a-string-to-number-in-typescript
                }
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

  const getProvider = () => {
    const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST;
    // Create a new connection object
    const connection = new Connection(rpcHost!!);
    return connection;
  };

  const tryExchange = async () => {
    let provider = getProvider();
    let walletAddress = (window as any).solana;

    // do something
  };

  return (
    // I could use kyogre-blue-light for the background or just plain black :'/ i wonder which looks better.
    // The outer container NEEDS to be relative!
    <div className="relative flex-col items-center justify-between min-h-screen pt-14 px-5 md:px-20 bg-black overflow-hidden">
      <Head>
        <title>pokèDEX</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col items-center space-y-8 text-white">
        <Image src={PokedexBanner} />
        {!walletAddress && renderNotConnectedContainer()}
      </div>
      {walletAddress && renderSwapContainer()}
      <footer className="flex items-center justify-center w-full fixed bottom-0 left-0">
        <a
          className="flex items-center justify-center text-white font-bold"
          href={TWITTER_LINK}
          target="_blank"
          rel="noreferrer"
        >
          <Image alt="Twitter Logo" width={35} height={35} src={twitterLogo} />
          {`built by @${TWITTER_HANDLE}`}
        </a>
      </footer>
    </div>
  );
}
