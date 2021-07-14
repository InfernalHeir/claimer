import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();

  const mockFactory = await ethers.getContractFactory("MOCKERC20");
  const supply = ethers.utils.parseUnits("500000000000", "ether");

  const ORO = await mockFactory
    .connect(owner)
    .deploy("ORO Token", "ORO", supply);

  const UFARM = await mockFactory
    .connect(owner)
    .deploy("Unifarm Token", "UFARM", supply);

  // wait for deploy
  await ORO.deployed();
  await UFARM.deployed();

  console.log(`new ORO Token ${ORO.address}`);
  console.log(`new UFARM Token ${UFARM.address}`);
}

main();
