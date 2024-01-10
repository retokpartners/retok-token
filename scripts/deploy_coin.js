const hre = require('hardhat')
async function main() {
  const PaymentCoin = await ethers.getContractFactory("PaymentCoin");
    // Deploy
    deployedContract = await PaymentCoin.deploy('PaymentCoin', 'PCR');
    await deployedContract.deployed();
    console.log('PaymentCoin deployed to ' + deployedContract.address);

    // Verify
    await hre.run('verify:verify', {
      address: deployedContract.address,
      constructorArguments: [
        'PaymentCoin',
        'PCR'
      ]
    })

    console.log('PaymentCoin verified.')
  }


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
