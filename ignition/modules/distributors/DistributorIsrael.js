const MCP = require("../MCP")
const RTKIL = require("../tokens/TokenIsrael")
const USDRT = require("../coins/CoinUSD")

const { buildDistributorModule } = require("../../../lib/buildDistributorModule")
module.exports = buildDistributorModule('RTKIL', MCP, RTKIL, USDRT)