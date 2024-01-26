const MCP = require("../MCP")
const RTKFR = require("../tokens/TokenFrance")
const USDRT = require("../coins/CoinUSD")

const { buildDistributorModule } = require("../../../lib/buildDistributorModule")
module.exports = buildDistributorModule('RTKFR', MCP, RTKFR, USDRT)