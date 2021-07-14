import { ethers, waffle } from "hardhat";
import chai, { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "@ethersproject/contracts";
import _ from "lodash";
import {
  AbiCoder,
  formatUnits,
  keccak256,
  solidityKeccak256
} from "ethers/lib/utils";

const { solidity } = waffle;
chai.use(solidity);

type Address = string;

interface OldTokens {
  oldORO: Contract;
  oldUFARM: Contract;
}

interface NewTokens {
  newORO: Contract;
  newUFARM: Contract;
}

const ZERO_ADDRESS: string = "0x0000000000000000000000000000000000000000";

const BiconomyForwarder: string = "0x61456BF1715C1415730076BB79ae118E806E74d2";

describe("UNIFARM Claimer Contract", () => {
  var claimer: Contract;
  var owner: SignerWithAddress;
  var alice: SignerWithAddress;

  var oldTokens: OldTokens;
  var newTokens: NewTokens;

  before(async () => {
    const [ownerSigner, aliceSigner] = await ethers.getSigners();

    owner = ownerSigner;
    alice = aliceSigner;

    const claimerFactory = await ethers.getContractFactory("Claimer");
    // deploy the claimer contract
    const CLAIMER = await claimerFactory
      .connect(owner)
      .deploy(BiconomyForwarder);
    // wait for the deployment done
    await CLAIMER.deployed();

    claimer = CLAIMER;

    // deploy mock contract as well
    const mockFactory = await ethers.getContractFactory("MOCKERC20");
    const supply = ethers.utils.parseUnits("50000", "ether");

    const ORO = await mockFactory
      .connect(owner)
      .deploy("ORO Token", "ORO", supply);

    const UFARM = await mockFactory
      .connect(owner)
      .deploy("Unifarm Token", "UFARM", supply);

    // wait for deploy
    await ORO.deployed();
    await UFARM.deployed();

    oldTokens = {
      oldORO: ORO,
      oldUFARM: UFARM
    };
  });

  describe("distribute the tokens", async () => {
    it("send ORO Tokens to alice", async () => {
      const { oldORO } = oldTokens;
      const tokens = ethers.utils.parseUnits("5000", "ether");
      await oldORO.connect(owner).transfer(alice.address, tokens);
    });

    it("send UFARM Tokens as well to alice", async () => {
      const { oldUFARM } = oldTokens;
      const tokens = ethers.utils.parseUnits("15000", "ether");
      await oldUFARM.connect(owner).transfer(alice.address, tokens);
    });
  });

  describe("Hack duration", () => {
    it("After 4 months the tokens got hacked", async () => {
      const graceDays = _.multiply(86400, 120);
      await ethers.provider.send("evm_increaseTime", [graceDays]);
    });
  });

  describe("We redploying the contracts", () => {
    it("deploy the new Tokens on BSC", async () => {
      const mockFactory = await ethers.getContractFactory("MOCKERC20");
      const supply = ethers.utils.parseUnits("60000", "ether");
      const newORO = await mockFactory
        .connect(owner)
        .deploy("ORO Token", "ORO", supply);

      const newUFARM = await mockFactory
        .connect(owner)
        .deploy("Unifarm Token", "UFARM", supply);

      // wait for deployment
      await newORO.deployed();
      await newUFARM.deployed();

      newTokens = {
        newORO,
        newUFARM
      };
    });
  });

  describe("Redistributed the New Tokens", async () => {
    it("projects can be added by only owner", async () => {
      const totalswapTokens = ethers.utils.parseUnits("50000", "ether");
      await expect(
        claimer
          .connect(alice)
          .addProject(
            oldTokens.oldORO.address,
            newTokens.newORO.address,
            totalswapTokens
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverted on '0x' old implemetation address", async () => {
      const totalswapTokens = ethers.utils.parseUnits("50000", "ether");
      await expect(
        claimer
          .connect(owner)
          .addProject(ZERO_ADDRESS, newTokens.newORO.address, totalswapTokens)
      ).to.be.revertedWith("addProject:: invalid implementation addresses");
    });

    it("reverted on ZERO swap amount", async () => {
      await expect(
        claimer
          .connect(owner)
          .addProject(oldTokens.oldORO.address, newTokens.newORO.address, 0)
      ).to.be.revertedWith("addProject:: invaild totalSwapTokens");
    });

    it("add ORO project", async () => {
      const totalswapTokens = ethers.utils.parseUnits("50000", "ether");
      await expect(
        claimer
          .connect(owner)
          .addProject(
            oldTokens.oldORO.address,
            newTokens.newORO.address,
            totalswapTokens
          )
      ).to.be.emit(claimer, "ProjectAdded");
    });

    it("add UFARM project", async () => {
      const totalswapTokens = ethers.utils.parseUnits("60000", "ether");
      await expect(
        claimer
          .connect(owner)
          .addProject(
            oldTokens.oldUFARM.address,
            newTokens.newUFARM.address,
            totalswapTokens
          )
      ).to.be.emit(claimer, "ProjectAdded");
    });

    it("Get the ORO project details", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );

      const projectDetails = await claimer.projects(projectBytes);

      expect(
        String(projectDetails.oldImplementation).toLowerCase()
      ).to.be.equal(String(oldTokens.oldORO.address).toLowerCase());

      expect(
        String(projectDetails.newImplementation).toLowerCase()
      ).to.be.equal(String(newTokens.newORO.address).toLowerCase());

      expect(Number(formatUnits(projectDetails.totalSwapTokens))).to.be.equal(
        50000
      );
    });

    it("Get the UFARM project details", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldUFARM.address, newTokens.newUFARM.address]
      );

      const projectDetails = await claimer.projects(projectBytes);

      expect(
        String(projectDetails.oldImplementation).toLowerCase()
      ).to.be.equal(String(oldTokens.oldUFARM.address).toLowerCase());

      expect(
        String(projectDetails.newImplementation).toLowerCase()
      ).to.be.equal(String(newTokens.newUFARM.address).toLowerCase());

      expect(Number(formatUnits(projectDetails.totalSwapTokens))).to.be.equal(
        60000
      );
    });

    // we can update the project
    it("non owner access not able to update the project details", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );
      const totalswapTokens = ethers.utils.parseUnits("60000", "ether");
      await expect(
        claimer
          .connect(alice)
          .updateProjectDetails(
            projectBytes,
            oldTokens.oldORO.address,
            newTokens.newORO.address,
            totalswapTokens
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("0x address invalid ??", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newUFARM.address]
      );
      const totalswapTokens = ethers.utils.parseUnits("60000", "ether");
      await expect(
        claimer
          .connect(owner)
          .updateProjectDetails(
            projectBytes,
            ZERO_ADDRESS,
            newTokens.newORO.address,
            totalswapTokens
          )
      ).to.be.revertedWith(
        "updateProjectDetails:: invalid implementation addresses"
      );
    });

    it("zero amount not accepted", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );

      await expect(
        claimer
          .connect(owner)
          .updateProjectDetails(
            projectBytes,
            oldTokens.oldORO.address,
            newTokens.newORO.address,
            0
          )
      ).to.be.revertedWith("updateProjectDetails:: invaild totalSwapTokens");
    });

    it("oro project updated", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newUFARM.address]
      );

      const totalswapTokens = ethers.utils.parseUnits("60000", "ether");

      await expect(
        claimer
          .connect(owner)
          .updateProjectDetails(
            projectBytes,
            oldTokens.oldORO.address,
            newTokens.newORO.address,
            totalswapTokens
          )
      ).to.be.emit(claimer, "ProjectAdded");
    });

    it("Get the new ORO project details", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );

      const projectDetails = await claimer.projects(projectBytes);

      expect(
        String(projectDetails.oldImplementation).toLowerCase()
      ).to.be.equal(String(oldTokens.oldORO.address).toLowerCase());

      expect(
        String(projectDetails.newImplementation).toLowerCase()
      ).to.be.equal(String(newTokens.newORO.address).toLowerCase());

      expect(Number(formatUnits(projectDetails.totalSwapTokens))).to.be.equal(
        60000
      );
    });

    it("pause the contract", async () => {
      await expect(claimer.connect(owner).pause())
        .to.be.emit(claimer, "Paused")
        .withArgs(owner.address);
    });

    it("swap the old oro with new oro on paused", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );
      const amount = ethers.utils.parseUnits("5000", "ether");
      await expect(
        claimer.connect(alice).swap(projectBytes, amount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("unpause the contract", async () => {
      await expect(claimer.connect(owner).unpause())
        .to.be.emit(claimer, "Unpaused")
        .withArgs(owner.address);
    });

    it("on swap approval is must", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );
      const amount = ethers.utils.parseUnits("5000", "ether");
      await expect(
        claimer.connect(alice).swap(projectBytes, amount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });

    it("liquidate new tokens in Claimer Contract", async () => {
      const amount = ethers.utils.parseUnits("60000", "ether");
      await newTokens.newORO.connect(owner).transfer(claimer.address, amount);
      await newTokens.newUFARM.connect(owner).transfer(claimer.address, amount);
    });

    it("swap the ORO", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );

      const amount = ethers.utils.parseUnits("5000", "ether");
      await oldTokens.oldORO.connect(alice).approve(claimer.address, amount);

      await expect(
        claimer.connect(alice).swap(projectBytes, amount)
      ).to.be.emit(claimer, "Swap");
    });

    it("he tried again", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldORO.address, newTokens.newORO.address]
      );

      const amount = ethers.utils.parseUnits("5000", "ether");
      await oldTokens.oldORO.connect(alice).approve(claimer.address, amount);

      await expect(
        claimer.connect(alice).swap(projectBytes, amount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("alice getting the new tokens and he have no old tokens now", async () => {
      const newOroBalance = await newTokens.newORO.balanceOf(alice.address);
      const parsed = Number(formatUnits(newOroBalance, "ether"));
      const oldOroBalance = await oldTokens.oldORO.balanceOf(alice.address);
      expect(parsed).to.be.equal(5000);
      expect(oldOroBalance).to.be.equal(0);
    });

    it("contract have 5000 old oro balance", async () => {
      const oldOroBalance = await oldTokens.oldORO.balanceOf(claimer.address);
      const parsedOldValue = Number(formatUnits(oldOroBalance, "ether"));
      expect(parsedOldValue).to.be.equal(5000);
    });

    it("check the contract new ORO balance", async () => {
      const newOroBalance = await newTokens.newORO.balanceOf(claimer.address);
      const parsed = Number(formatUnits(newOroBalance, "ether"));
      expect(parsed).to.be.equal(55000);
    });

    it("you cant claim more than the limits", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldUFARM.address, newTokens.newUFARM.address]
      );

      const amount = ethers.utils.parseUnits("75000", "ether");
      await oldTokens.oldUFARM.connect(alice).approve(claimer.address, amount);

      await expect(
        claimer.connect(alice).swap(projectBytes, amount)
      ).to.be.revertedWith("swap::amount exceeds totalSwapTokens");
    });

    it("UFARM swap", async () => {
      const projectBytes = solidityKeccak256(
        ["address", "address"],
        [oldTokens.oldUFARM.address, newTokens.newUFARM.address]
      );

      const amount = ethers.utils.parseUnits("15000", "ether");
      await oldTokens.oldUFARM.connect(alice).approve(claimer.address, amount);

      await expect(
        claimer.connect(alice).swap(projectBytes, amount)
      ).to.be.emit(claimer, "Swap");
    });

    it("alice getting the new UFARM tokens and he have no old UFARM tokens now", async () => {
      const newUFARMBalance = await newTokens.newUFARM.balanceOf(alice.address);
      const parsed = Number(formatUnits(newUFARMBalance, "ether"));
      const oldUfarmBalance = await oldTokens.oldUFARM.balanceOf(alice.address);
      expect(parsed).to.be.equal(15000);
      expect(oldUfarmBalance).to.be.equal(0);
    });

    it("contract have 15000 old UFARM balance", async () => {
      const oldUfarmBalance = await oldTokens.oldUFARM.balanceOf(
        claimer.address
      );
      const parsedOldValue = Number(formatUnits(oldUfarmBalance, "ether"));
      expect(parsedOldValue).to.be.equal(15000);
    });

    it("check the contract new UFARM balance", async () => {
      const newUfarmBalance = await newTokens.newUFARM.balanceOf(
        claimer.address
      );
      const parsed = Number(formatUnits(newUfarmBalance, "ether"));
      expect(parsed).to.be.equal(45000);
    });
  });

  describe("Claimer Ownable functionality", async () => {
    it("owner will be the admin", async () => {
      expect(await claimer._admin()).to.be.equal(owner.address);
    });

    it("Admin can transafer Ownership", async () => {
      await expect(claimer.connect(owner).transferOwnership(alice.address))
        .to.be.emit(claimer, "OwnershipTransferred")
        .withArgs(owner.address, alice.address);
    });

    it("bob is the contract owner", async () => {
      expect(await claimer._owner()).to.be.equal(alice.address);
    });

    it("only Admin can call renounceOwnership even if real Owner cannot able to call", async () => {
      await expect(
        claimer.connect(alice).renounceOwnership()
      ).to.be.revertedWith("Ownable: caller is not the Admin");
    });

    it("Admin can renounceOwnership", async () => {
      await expect(claimer.connect(owner).renounceOwnership())
        .to.be.emit(claimer, "OwnershipTransferred")
        .withArgs(alice.address, owner.address);
    });

    it("will give me right owner", async () => {
      expect(await claimer._owner()).to.be.equal(owner.address);
    });

    it("get the trust forwarder address", async () => {
      const expectedTrustForwarder = await claimer.trustedForwarder();
      expect(String(expectedTrustForwarder).toLowerCase()).to.be.equal(
        BiconomyForwarder.toLowerCase()
      );
    });

    it("update the trust forwarder", async () => {
      await claimer.connect(owner).updateTrustForwarder(ZERO_ADDRESS);
    });

    it("now trust forwarder zero address", async () => {
      const expectedTrustForwarder = await claimer.trustedForwarder();
      expect(String(expectedTrustForwarder).toLowerCase()).to.be.equal(
        ZERO_ADDRESS.toLowerCase()
      );
    });

    it("get the forwarder version", async () => {
      const versionRecipient = await claimer.versionRecipient();
      expect(Number(versionRecipient)).to.be.equal(2);
    });
  });
});
