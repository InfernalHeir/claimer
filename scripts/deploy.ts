import { ethers } from "hardhat";

async function main() {
  const BiconomyForwarder: string =
    "0x61456BF1715C1415730076BB79ae118E806E74d2";

  const [owner] = await ethers.getSigners();

  const factory = await ethers.getContractFactory("Claimer");

  const Claimer = await factory.connect(owner).deploy(BiconomyForwarder);

  await Claimer.deployed();

  console.log(`Address of Claimer is ${Claimer.address}`);
}

main().then(() => {
  process.exit(0);
});
