class Pokemon {
  public name: string;
  public image: StaticImageData;
  public tokenAddress: string;
  public price: number;

  public constructor(
    thisname: string,
    thisimage: StaticImageData,
    thisTokenAddress: string = "TODO: Add Token Contracts :)", // Eventually associate this token address :)
    thisPrice: number
  ) {
    this.name = thisname;
    this.image = thisimage;
    this.tokenAddress = thisTokenAddress;
    this.price = thisPrice; // TODO eventually this should be info gotten from the oracle!
  }
}

export default Pokemon;
