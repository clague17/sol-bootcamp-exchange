import Head from "next/head";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import twitterLogo from "../assets/twitter-logo.svg";
import Pokemon from "./Pokemon";

const TokenView = (pokemon: Pokemon) => {
  return (
    <div className="flex flex-col mx-1 py-2 rounded-lg">
      <Image className="" src={pokemon.image} />
      <p className="px-5 pt-2">{pokemon.name}</p>
    </div>
  );
};

export default TokenView;
