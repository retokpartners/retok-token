const hre = require('hardhat')
async function main() {
  const DistributorAggregator = await ethers.getContractFactory("DistributorAggregator");
    // Deploy
    deployedContract = await DistributorAggregator.deploy();
    await deployedContract.deployed();
    console.log('DistributorAggregator deployed to ' + deployedContract.address);

    // Verify
    await hre.run('verify:verify', {
      address: deployedContract.address,
      constructorArguments: []
    })

    console.log('DistributorAggregator verified.')
  }


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
