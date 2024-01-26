const MCP = require("../MCP")
const USDRT = require("../coins/CoinUSD")

const { buildDistributorModule } = require("../../../lib/buildDistributorModule")
module.exports = buildDistributorModule('USDRT', MCP, USDRT, USDRT)