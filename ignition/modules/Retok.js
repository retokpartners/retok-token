const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const aggregatorModule = require("./DistributorAggregator")
const fs = require("fs")
const path = require("node:path");

let distributorModules = []
fs.readdirSync(`${__dirname}/distributors`).forEach((file) => {
  const importPath = "./distributors/" + path.basename(file, '.js')
  distributorModules.push(require(importPath))
})

module.exports = buildModule("Retok", (m) => {

  let distributors = []
  for(let i=0; i< distributorModules.length; i++) {
    let distributorModule = distributorModules[i]
    let distributor = m.useModule(distributorModule)
    distributors.push(distributor)
  }

  m.useModule(aggregatorModule)

  return { distributors }
})