const hre = require('hardhat')
async function main() {
  const PythSwap = await ethers.getContractFactory("PythSwap");

    /*
    // Testnet
    pythContract = '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C'
    inputTokenContract = '0xc23a968e7e02ff04D471d5c73f0C33F531971b61'
    outputTokenContract = '0xE51C3175A0FbFF856B30A7EA69fE8a91B3a6e32a'
    _priceId = '0xc1b12769f6633798d45adfd62bfc70114839232e2949b01fb3d3f927d2606154'
    */

    // Mainnet
    pythContract = '0x4305FB66699C3B2702D4d05CF36551390A4c69C6'
    inputTokenContract = '0xE1d70994Be12b73E76889412b284A8F19b0DE56d' // EEUR
    outputTokenContract = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' // USDC
    _priceId = '0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b' // EUR/USD
    // Deploy
    deployedContract = await PythSwap.deploy(pythContract, inputTokenContract, outputTokenContract, _priceId);
    await deployedContract.deployed();
    console.log('PythSwap deployed to ' + deployedContract.address);

    // Verify
    await hre.run('verify:verify', {
      address: deployedContract.address,
      constructorArguments: [pythContract, inputTokenContract, outputTokenContract, _priceId]
    })

    console.log('PythSwap verified.')
  }


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
