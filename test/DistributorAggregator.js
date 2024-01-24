const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("DistributorAggregator", async () => {
    // Roles
    const OWNER = 10n
    const WITHDRAWER = 20n
    beforeEach(async  () => {
        accounts = await ethers.getSigners()
        owner = accounts[0]
        alice = accounts[1]

        AccessManager = await ethers.getContractFactory("AccessManager");
        accessManager = await AccessManager.deploy(owner.address)

        DistributorAggregator = await ethers.getContractFactory("DistributorAggregator");
        distributorAggregator = await DistributorAggregator.deploy(accessManager.target);

        Distributor = await ethers.getContractFactory("MockDistributor");
        distributor1 = await Distributor.deploy();
        distributor2 = await Distributor.deploy();
        distributor3 = await Distributor.deploy();
        distributors = [distributor1.target, distributor2.target, distributor3.target]

        await accessManager.setTargetFunctionRole(
            distributorAggregator.target,
            [
                ethers.id('withdraw(address[])').substring(0, 10)
            ],
            WITHDRAWER
        )
        await distributor1.setIncome(alice.address, 123456)
        await distributor3.setIncome(alice.address, 654321)
    })

    it("should call withdraw on each specified distributor with positive balance", async () => {
        await accessManager.grantRole(WITHDRAWER, alice.address, 0)
        await expect(distributorAggregator.connect(alice).withdraw(distributors))
                .to.emit(distributor1, 'Withdrawal')
                .to.emit(distributor3, 'Withdrawal')
                .to.not.emit(distributor2, 'Withdrawal')

    })

    it("should not allow non authorized accounts to withdraw", async () => {
        await distributor1.setIncome(alice.address, 123456)
        await distributor3.setIncome(alice.address, 654321)

        await expect(distributorAggregator.connect(alice).withdraw(distributors))
            .to.be.revertedWithCustomError(distributorAggregator, 'AccessManagedUnauthorized')

    })
})
