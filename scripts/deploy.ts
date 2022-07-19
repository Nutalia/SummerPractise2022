import { ethers } from "hardhat";
import { Signer } from "ethers"

const WBNBaddress = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" //адрес токена WBNB
const balance = 1000000000

//интерфейс токена WBNB
const abi = [ "function transfer(address to, uint amount) returns (bool)" ];

async function main() {
  const Lending = await ethers.getContractFactory("Lending");
  const lending = await Lending.deploy("0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee" /*BUSD*/, 
                                       WBNBaddress /*WBNB*/,
                                       24*60*60 /*time of loan, 1 день*/);

  await lending.deployed();

  const WBNB = new ethers.Contract(WBNBaddress, abi, (await ethers.getSigners() as Signer[])[0])
  WBNB.transfer(lending.address, balance)

  console.log("Contract 'Lending' was deployed with balance:", balance, " and address:", lending.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
