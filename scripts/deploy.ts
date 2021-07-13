import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();

  const factory = await ethers.getContractFactory("Claimer");

  const Claimer = await factory.connect(owner).deploy();

  await Claimer.deployed();

  console.log(`Address of Claimer is ${Claimer.address}`);
}

main().then(() => {
  process.exit(0);
});
