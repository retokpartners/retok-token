const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { PREAPPROVEDWITHDRAWER, WITHDRAWER } = require("../../lib/roles")
const MCP = require("./MCP")

module.exports = buildModule("DistributorAggregator", (m) => {
  const { accessManager } = m.useModule(MCP);

  const aggregator = m.contract("DistributorAggregator", [accessManager])
  m.call(accessManager, "grantRole", [PREAPPROVEDWITHDRAWER, aggregator, 0])
  m.call(accessManager, "setTargetFunctionRole",[
    aggregator,
    [
        ethers.id('withdraw(address[])').substring(0, 10)
    ],
    WITHDRAWER
  ])

  return { aggregator };
})