import { HardhatUserConfig } from "hardhat/config";
import { config } from "dotenv";

// import plugins
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";

// set the configuration
config();

const RPC_URL = process.env.RPC_URL as string;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const BSC_API_KEY = process.env.BSC_API_KEY as string;
const MAINNET_RPC = process.env.MAINNET_RPC;

const hardhatConfig: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://localhost:8545"
    },
    testnet: {
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 97
    },
    mainnet: {
      url: MAINNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 56
    }
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  etherscan: {
    apiKey: BSC_API_KEY
  }
};

export default hardhatConfig;
