const MCP = require("../MCP")
const RTKCH = require("../tokens/TokenSwitzerland")
const USDRT = require("../coins/CoinUSD")

const { buildDistributorModule } = require("../../../lib/buildDistributorModule")
module.exports = buildDistributorModule('RTKCH', MCP, RTKCH, USDRT)