const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("DistributorAggregator", async () => {
    it("should call withdraw on each specified distributor with positive balance", async () => {
        DistributorAggregator = await ethers.getContractFactory("DistributorAggregator");
        distributorAggregator = await DistributorAggregator.deploy();
        Distributor = await ethers.getContractFactory("MockDistributor");
        distributor1 = await Distributor.deploy();
        distributor2 = await Distributor.deploy();
        distributor3 = await Distributor.deploy();
        distributors = [distributor1.address, distributor2.address, distributor3.address]

        accounts = await ethers.getSigners()
        owner = accounts[0]

        await distributor1.setShare(owner.address, 123456)
        await distributor3.setShare(owner.address, 654321)

        await expect(distributorAggregator.withdraw(distributors))
                .to.emit(distributor1, 'Withdrawal')
                .to.emit(distributor3, 'Withdrawal')
                .to.not.emit(distributor2, 'Withdrawal')

    })
})
