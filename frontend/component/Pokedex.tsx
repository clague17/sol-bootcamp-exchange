import React from "react";
import { Image } from "@chakra-ui/react";
// import pokedexImg from "../assets/pokedex.png";

const Pokedex = () => {
  return (
    <div style={{ maxWidth: "100%", maxHeight: "100%" }}>
      <Image
        boxSize="50px"
        objectFit="cover"
        alt="pokedex"
        maxWidth="100%"
        src={"../assets/pokedex.png"}
      />
    </div>
  );
};

export default Pokedex;
