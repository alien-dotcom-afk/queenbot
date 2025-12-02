module.exports = {
  ETH: {
    address: process.env.CRYPTO_ETH_ADDRESS,
    explorer: "https://etherscan.io/tx/"
  },
  LTC: {
    address: process.env.CRYPTO_LTC_ADDRESS,
    explorer: "https://blockchair.com/litecoin/transaction/"
  },
  SOL: {
    address: process.env.CRYPTO_SOL_ADDRESS,
    explorer: "https://solscan.io/tx/"
  },
  USDT: {
    address: process.env.CRYPTO_USDT_ERC20_ADDRESS,
    explorer: "https://etherscan.io/tx/"
  }
};
