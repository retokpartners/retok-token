const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { OWNER } = require("./roles")

const buildTokenModule = (name, symbol, mcp) => {
  return buildModule(symbol, (m) => {
    const { accessManager } = m.useModule(mcp);
    const token = m.contract("SnapshotToken", [name, symbol, accessManager]);

    // Add methods to accessManager
    m.call(accessManager, "setTargetFunctionRole",
      [
        token,
        [
          ethers.id('burn(address,uint256,uint8)').substring(0, 10),
          ethers.id('mintTo(address,uint256,uint8)').substring(0, 10)
        ],
        OWNER
      ]
    )
    return { token }
  })
}

module.exports = { buildTokenModule: buildTokenModule }