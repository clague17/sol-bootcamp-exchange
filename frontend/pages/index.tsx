import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { Heading, Text, Stack, Image } from "@chakra-ui/react";
import twitterLogo from "../assets/twitter-logo.svg";
import Pokedex from "../component/Pokedex";

// Constants
const TWITTER_HANDLE = "clague17";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

type FeatureProps = {
  title: string;
  desc: string;
};

const Feature = (props: FeatureProps) => (
  <div>
    <Heading fontSize={"72px"}>{props.title}</Heading>
    <Text mt={4} fontSize={"36px"}>
      {props.desc}
    </Text>
  </div>
);

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>pokéDEX</title>
        <meta name="description" content="Your favorite DEX on Solana" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Stack spacing={8} align="center">
        <Feature title={"pokéDEX "} desc={"swap your tokens"} />
        <Image
          src={
            "https://media2.giphy.com/media/fSvqyvXn1M3btN8sDh/giphy.gif?cid=ecf05e47f3cmli4l64unl59820kxmcaocd0855t7s1hfsk5v&rid=giphy.gif&ct=g"
          }
          boxSize="300px"
          objectFit="cover"
          alt="dancing pikachu"
          borderRadius="20"
          maxWidth="100%"
        />
        {/* {!walletAddress && renderNotConnectedContainer()} */}
      </Stack>

      <main className={styles.main}></main>

      <div className="footer-container">
        <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
        <a
          className="footer-text"
          href={TWITTER_LINK}
          target="_blank"
          rel="noreferrer"
        >{`built by @${TWITTER_HANDLE}`}</a>
      </div>
    </div>
  );
};

export default Home;
