const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { OWNER } = require("../../lib/roles")

module.exports = buildModule("MCP", (m) => {
  let owner = m.getAccount(0)
  const accessManager = m.contract("AccessManager", [owner]);
  m.call(accessManager, "grantRole", [OWNER, owner, 0])

  return { accessManager };
});