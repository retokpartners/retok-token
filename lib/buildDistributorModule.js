const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { OWNER, PREAPPROVEDWITHDRAWER, WITHDRAWER } = require("./roles")

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
    ) // Not actually useful

    m.call(accessManager, "setTargetFunctionRole",
      [
        distributor,
        [
          ethers.id('withdraw()').substring(0, 10),
        ],
        WITHDRAWER
      ],
      { id: "Withdrawer"}
    )

    m.call(accessManager, "setTargetFunctionRole",
      [
        distributor,
        [
          ethers.id('withdrawTo(address)').substring(0, 10),
        ],
        PREAPPROVEDWITHDRAWER
      ],
      { id: "PreApprovedWithdrawer"}
    )
    return { distributor }
  })
}

module.exports = { buildDistributorModule: buildDistributorModule }