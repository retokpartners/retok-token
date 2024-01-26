const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { OWNER } = require("./roles")

const buildDistributorModule = (symbol, mcpModule, tokenModule, coinModule) => {
  return buildModule(`Distributor_${symbol}`, (m) => {
    const { accessManager } = m.useModule(mcpModule)
    const { token } = m.useModule(tokenModule)
    const { token: coin } = m.useModule(coinModule)
    const previousAddress = m.getParameter("previousAddress", ethers.ZeroAddress)

    const distributor = m.contract("Distributor", [accessManager, token, coin, previousAddress])

    // Add methods to accessManager
    m.call(accessManager, "setTargetFunctionRole",
      [
        distributor,
        [
          ethers.id('burn(address,uint256,uint8)').substring(0, 10),
          ethers.id('mintTo(address,uint256,uint8)').substring(0, 10)
        ],
        OWNER
      ]
    )
    return { distributor }
  })
}

module.exports = { buildDistributorModule: buildDistributorModule }