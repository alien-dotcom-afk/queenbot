const CRYPTO = require("../config/crypto");

function explorerLink(symbol, txId) {
  return CRYPTO[symbol].explorer + txId;
}

module.exports = { explorerLink };
