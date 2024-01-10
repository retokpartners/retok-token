const hre = require('hardhat')
async function main() {
  const WhitelistToken = await ethers.getContractFactory("WhitelistToken");
  contracts = [
    {"name": "Retok France", "symbol": "RTKFR"},
    {"name": "Retok Switzerland", "symbol": "RTKCH"},
    {"name": "Retok Israel", "symbol": "RTKIL"}
  ]

  for (i=0; i < contracts.length; i++) {
    let contract = contracts[i];

    // Deploy
    deployedContract = await WhitelistToken.deploy(contract.name, contract.symbol);
    await deployedContract.deployed();
    console.log(contract.name + ' deployed to ' + deployedContract.address);

    // Verify
    if (contract.symbol != 'RTKIL') {
      continue;
    }
    await hre.run('verify:verify', {
      address: deployedContract.address,
      constructorArguments: [
        contract.name,
        contract.symbol
      ]
    })

    console.log(contract.name + ' verified.')
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
