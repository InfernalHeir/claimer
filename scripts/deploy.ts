import { ethers } from "hardhat";

async function main() {
  const BiconomyForwarder: string =
    "0x0000000000000000000000000000000000000000";

  const [owner] = await ethers.getSigners();

  const factory = await ethers.getContractFactory("Claimer");

  const Claimer = await factory
    .connect(owner)
    .deploy(BiconomyForwarder, "0x9D00f0AF42291D9130E34B5a615F41b306409082");

  await Claimer.deployed();

  // set the project
  const totalSwapAmount = ethers.utils.parseUnits("5000000000", "ether");
  const transaction = await Claimer.connect(owner).addProject(
    "0x4eBf6Ed5DAcfa34BeE0db8F99Dd9bBEE62597e5a",
    "0x378007d9724310De97B847d7cD93698E19211FbA",
    totalSwapAmount
  );
  await transaction.wait(1);

  console.log(`Address of Claimer is ${Claimer.address}`);
  console.log("project added", transaction.hash);
}

main().then(() => {
  process.exit(0);
});
