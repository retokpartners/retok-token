const hre = require('hardhat')
async function main() {
  const Distributor = await ethers.getContractFactory("Distributor");
  const coin = "0xc23a968e7e02ff04D471d5c73f0C33F531971b61";
  tokens = [
    {"name": "Retok France", "address": "0x0fcB910D7c30060349A62b07EDC56B1FE0a97072"},
    {"name": "Retok Switzerland", "address": "0x0C71Ad6b9Bf521c01Eef46D1c0Bbc9caAfB13EEE"},
    {"name": "Retok Israel", "address": "0x8B630e010c574aFA9EaA5e598ad92A2b7A852Aa0"}
  ]

  for (i=0; i < tokens.length; i++) {
    let token = tokens[i];
    // Deploy
    deployedDistributor = await Distributor.deploy(token.address, coin);
    await deployedDistributor.deployed();
    console.log(token.name + ' distributor deployed to ' + deployedDistributor.address);

    // Verify
    if (token.name != 'Retok Israel') {
      continue;
    }
    await hre.run('verify:verify', {
      address: deployedDistributor.address,
      constructorArguments: [
        token.address,
        coin
      ]
    })

    console.log(token.name + ' verified.')
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
