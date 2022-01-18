class Pokemon {
  public name: string;
  public image: StaticImageData;
  public tokenAddress: string;

  public constructor(
    thisname: string,
    thisimage: StaticImageData,
    thisTokenAddress: string = "TODO: Add Token Contracts :)" // Eventually associate this token address :)
  ) {
    this.name = thisname;
    this.image = thisimage;
    this.tokenAddress = thisTokenAddress;
  }
}

export default Pokemon;
