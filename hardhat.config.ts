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
const RINKEBY_RPC = process.env.RINKEBY_RPC;
const POLYGON_RPC = process.env.POLYGON_RPC as string;
const AVAX_RPC = process.env.AVAX_RPC as string;

const hardhatConfig: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://localhost:8545",
    },
    testnet: {
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 97,
    },
    polygon: {
      url: POLYGON_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
    },
    avax: {
      url: AVAX_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 43113,
    },
    rinkeby: {
      url: RINKEBY_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 4,
    },
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: BSC_API_KEY,
  },
};

export default hardhatConfig;
