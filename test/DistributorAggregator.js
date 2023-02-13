const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("DistributorAggregator", async () => {
    it("should call withdraw on each specified distributor ", async () => {
        DistributorAggregator = await ethers.getContractFactory("DistributorAggregator");
        distributorAggregator = await DistributorAggregator.deploy();
        Distributor = await ethers.getContractFactory("MockDistributor");
        distributor1 = await Distributor.deploy();
        distributor2 = await Distributor.deploy();
        distributor3 = await Distributor.deploy();
        distributors = [distributor1.address, distributor2.address, distributor3.address]

        await expect(distributorAggregator.withdraw(distributors))
                .to.emit(distributor1, 'Withdrawal')
                .to.emit(distributor2, 'Withdrawal')
                .to.emit(distributor3, 'Withdrawal')
    })
})
