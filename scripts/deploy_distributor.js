const hre = require('hardhat')
async function main() {
  const Distributor = await ethers.getContractFactory("Distributor");


  // Mainnet
  const coin = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"; // Mainnet (USDC)
  tokens = [
    {"name": "Retok France", "address": "0xD22dF86b096728caeeB8229FbcA8B29713f5c35a", income:       [1645, 538, 530, 514, 508, 512, 545, 600]},
    {"name": "Retok Switzerland", "address": "0x3CF2F41d45758DfAa3852981c2D288557CDA7c42", income:  [2286, 748, 736, 714, 705, 711, 758, 816]},
    {"name": "Retok Israel", "address": "0xD317a6213504B02a9a3c4c7A2e443449b5F457DA", income:       [961, 161, 164, 159, 154, 150, 159, 212]}
  ]


/*
  // Testnet
  const coin = "0xE51C3175A0FbFF856B30A7EA69fE8a91B3a6e32a"; // Testnet (PCR)
  tokens = [
    {"name": "Retok France", "address": "0x6Da34D3540075D0480ECd77e4687839973C592e1", income: [1544, 516, 516, 516, 518, 518]},
    {"name": "Retok Switzerland", "address": "0x0BC532CDfD80f5d8b45350838972D488E9eA7C74", income: []},
    {"name": "Retok Israel", "address": "0x064C6a5c4DB4A303eE299bdEa57E5075048D7a1E", income: [902, 154, 160, 160, 157, 152, 151, 198] }
  ]
*/
  for (i=0; i < tokens.length; i++) {
    let token = tokens[i];
    // Deploy
    deployedDistributor = await Distributor.deploy(token.address, coin, token.income);
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
        coin,
        token.income
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
