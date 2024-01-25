const { expect } = require("chai")
const { ethers } = require("hardhat")

// https://stackoverflow.com/questions/19277973/generate-4-random-numbers-that-add-to-a-certain-value-in-javascript
function randombetween(min, max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

function generate(max, thecount) {
    var r = [];
    var currsum = 0;
    for(var i=0; i<thecount-1; i++) {
       r[i] = randombetween(1, max-(thecount-i-1)-currsum);
       currsum += r[i];
    }
    r[thecount-1] = max - currsum;
    return r;
}

class Tester {
    name
    account
    snapshots = []
    share = 0
    income = 0
    previousIncome = 0

    constructor(name, account, previousIncome=randombetween(250, 145000)) {
        this.name = name
        this.account = account
        this.previousIncome = previousIncome
        this.income = this.previousIncome
    }

    addIncome(amount) {
        this.snapshots.push(this.share)
        this.income += Math.floor(this.share * (amount * 100) / 1000000)
    }

    withdraw() {
        this.income = 0
    }
}
class Portfolio {
    totalIncomes = []
    testers = []

    totalIncome () {
        return this.totalIncomes.reduce((acc, income) => { return acc += income}, 0)
    }

    addRandomIncome() {
        let newIncome = randombetween(2000, 100000)
        this.addIncome(newIncome)
        return newIncome
    }

    addIncome(amount) {
        this.totalIncomes.push(amount)
        this.generateShares()
        for(i=0; i<this.testers.length; i++) {
            let tester = this.testers[i]
            tester.addIncome(amount)
        }
    }

    snapshotId() {
        return this.totalIncomes.length
    }

    addTester(tester) {
        this.testers.push(tester)
        this.generateShares()
    }

    mintTokensToTester(name, amount) {
        this.getTesterByName(name).addTokens(amount)
    }

    generateShares() {
        let shares = generate(1000000, this.testers.length)
        for(let i=0; i<this.testers.length; i++) {
            let tester = this.testers[i]
            tester.share = shares[i]
        }
    }

    static getTesterByName(name) {
        return this.testers.find((tester) => tester.name == name);
    }

}

describe("Distributor", () => {
    let AccessManager
    let accessManager

    let Distributor
    let distributor

    let MockDistributor
    let previousDistributor

    let MockSnapshotToken
    let snapshotToken

    let accounts
    let owner
    let alice
    let bob
    let chris
    let broker
    let testers


    let portfolio

    // Roles
    const OWNER = 10n
    const WITHDRAWER = 20n
    const PREAPPROVEDWITHDRAWER = 30n


    // Add a random amount income to the simulated portfolio, then to the contract
    async function addRandomIncome() {
        let newIncome = portfolio.addRandomIncome()
        await distributor.addIncome(newIncome)
        for(let i=0; i < portfolio.testers.length; i++) {
            let tester = portfolio.testers[i]
            await snapshotToken.setShareOfAt(tester.account.address, portfolio.snapshotId(), tester.share)
        }
        return newIncome
    }

    // Check that each token holder income share is consistent with portfolio data
    async function checkTestersShare() {
        for(let i=0; i < portfolio.testers.length; i++) {
            let tester = portfolio.testers[i]
            let expectedAmount = tester.income

            await distributor.computeCumulativeShare(tester.account.address)
            let shareAmount = await distributor.cumulativeShareOf(tester.account.address)
            expect(shareAmount).to.equal(Math.floor(expectedAmount))
        }
    }

    // Check that the amount withdrawn matches the balance of each token holder income share
    async function checkTestersWithdraw() {
        for(let i=0; i < portfolio.testers.length; i++) {
            let tester = portfolio.testers[i]
            await accessManager.grantRole(WITHDRAWER, tester.account.address, 0)
            // Tester has no balance to withdraw
            if (tester.income == 0) {
                await expect(distributor.connect(tester.account).withdraw()).to.be.revertedWith('Distributor: No balance to withdraw')
                return
            }

            await paymentCoin.mintTo(distributor.target, tester.income * 10000)

            await expect(distributor.connect(tester.account).withdraw())
                .to.changeTokenBalance(paymentCoin, tester.account.address, tester.income * 10000)
        }
    }

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0]

        AccessManager = await ethers.getContractFactory("AccessManager")
        accessManager = await AccessManager.deploy(owner.address)

        PaymentCoin = await ethers.getContractFactory("PaymentCoin")
        paymentCoin = await PaymentCoin.deploy('PaymentCoin', 'PCR')

        MockSnapshotToken = await ethers.getContractFactory("MockSnapshotToken")
        snapshotToken = await MockSnapshotToken.deploy()

        MockDistributor = await ethers.getContractFactory("MockDistributor")
        previousDistributor = await MockDistributor.deploy()

        // Create testers and add them to the portfolio
        alice = new Tester('alice', accounts[1])
        bob = new Tester('bob', accounts[2])
        // Set 0 previous income for one tester
        chris = new Tester('chris',accounts[3], 0)

        portfolio = new Portfolio()
        portfolio.addTester(alice)
        portfolio.addTester(bob)
        portfolio.addTester(chris)

        // Shortcut to broker account
        broker = accounts[4]

        // Initialize previous incomes
        for(i=0; i< portfolio.testers.length; i++) {
            let tester = portfolio.testers[i]
            await previousDistributor.setIncome(tester.account.address, tester.previousIncome)
        }

        Distributor = await ethers.getContractFactory("Distributor")
        distributor = await Distributor.deploy(accessManager.target, snapshotToken.target, paymentCoin.target, previousDistributor.target)

        // Roles and permissions
        await accessManager.grantRole(OWNER, owner.address, 0)
        await accessManager.setTargetFunctionRole(
            distributor.target,
            [
                ethers.id('transferToOwner(uint256)').substring(0, 10),
                ethers.id('addIncome(uint40)').substring(0, 10)
            ],
            OWNER
        )

        await accessManager.setTargetFunctionRole(
            distributor.target,
            [
                ethers.id('withdrawTo(address)').substring(0, 10)
            ],
            PREAPPROVEDWITHDRAWER
        )

        await accessManager.setTargetFunctionRole(
            distributor.target,
            [
                ethers.id('withdraw()').substring(0, 10)
            ],
            WITHDRAWER
        )
    })

    describe("deployment", () => {
        it("should set the right manager", async function () {
            expect(await distributor.authority()).to.equal(accessManager.target);
        })
    })

    it("should trigger a snapshot on the token when adding an income", async () => {
        await expect(distributor.addIncome(12345))
            .to.emit(snapshotToken, 'Snapshot')
    })

    it("should not accept a 0 income", async () => {
        await expect(distributor.addIncome(0)).to.be.revertedWith('Distributor: amount has to be > 0')
    })

    it("should emit the IncomeAdded event when sucessfuly adding an income", async () => {
        await expect(distributor.addIncome(12345))
            .to.emit(distributor, 'IncomeAdded')
            .withArgs(12345, 1)
    })

    it("should not allow a non-owner to add an income", async () => {
        await expect(distributor.connect(alice.account).addIncome(11000)).to.be.revertedWithCustomError(distributor, 'AccessManagedUnauthorized')
    })

    it("should not be able to compute cumulative share before at least one income has been added", async () => {
        distributor = await Distributor.deploy(accessManager.target, snapshotToken.target, paymentCoin.target, ethers.ZeroAddress);
        await expect(distributor.computeCumulativeShare(alice.account.address)).to.be.reverted
    })

    it("should not be able to return a cumulative share before at least one income has been added", async () => {
        distributor = await Distributor.deploy(accessManager.target, snapshotToken.target, paymentCoin.target, ethers.ZeroAddress);
        await expect(distributor.cumulativeShareOf(alice.account.address)).to.be.reverted
    })

    it("should allow the owner to transfer funds out of the contract", async () => {
        await paymentCoin.mintTo(distributor.target, 100000)
        await distributor.transferToOwner(100000)
        expect(await paymentCoin.balanceOf(owner.address)).to.equal(100000)
    })

    it("should not allow the owner to transfer more funds out of the contract than there is available", async () => {
        await paymentCoin.mintTo(distributor.target, 100000)
        await expect(distributor.transferToOwner(100001)).to.be.revertedWith("Distributor: Contract doesn't have sufficient fund")
    })

    it("should not allow a non-owner to transfer funds out of the contract", async () => {
        await paymentCoin.mintTo(distributor.target, 100000)
        await expect(distributor.connect(alice.account).transferToOwner(100000)).to.be.revertedWithCustomError(distributor, 'AccessManagedUnauthorized')
    })

    describe("share computations", () => {
        it("should not return a cumulative share before any share has been computed", async () => {
            await expect(distributor.cumulativeShareOf(alice.account.address)).to.be.revertedWith('Distributor: Call computeCumulativeShare first to update share')
        })

        it("should be able to compute cumulative share of alice", async () => {
            await distributor.computeCumulativeShare(alice.account.address)
        })

        it("should initialize cumulative share from previous instance", async () => {
            for(i=0; i < portfolio.testers.length; i++) {
                let tester = portfolio.testers[i]
                await distributor.computeCumulativeShare(tester.account.address)
                let shareAmount = await distributor.cumulativeShareOf(tester.account.address)
                expect(shareAmount).to.equal(tester.previousIncome)
            }
        })

        it("should return the right cumulative share after a new income has been added, ", async () => {
            await addRandomIncome()
            await checkTestersShare()
        })
    })

    describe("withdrawals", () => {
        it(`should not allow withdrawal if the sender has no balance available`, async () => {
            await accessManager.grantRole(WITHDRAWER, broker.address, 0)
            await expect(distributor.connect(broker).withdraw()).to.be.revertedWith("Distributor: No balance to withdraw")
        })

        it(`should not allow withdrawal if the sender is not whitelisted`, async () => {
            await paymentCoin.mintTo(distributor.target, alice.income * 10000)
            await expect(distributor.connect(alice.account).withdraw()).to.be.revertedWithCustomError(distributor, 'AccessManagedUnauthorized')
        })

        it(`should not allow withdrawal if the contract is underfunded`, async () => {
            await accessManager.grantRole(WITHDRAWER, alice.account.address, 0)
            await expect(distributor.connect(alice.account).withdraw()).to.be.revertedWith("Distributor: Contract doesn't have sufficient fund")
        })

        it(`should allow token holders to withdraw their balance`, async () => {
            await checkTestersWithdraw()
        })

        it(`should reset balance to 0 after withdrawal`, async () => {
            await paymentCoin.mintTo(distributor.target, alice.income*10000)
            await accessManager.grantRole(WITHDRAWER, alice.account.address, 0)
            await distributor.connect(alice.account).withdraw()
            await expect(distributor.connect(alice.account).withdraw()).to.be.revertedWith('Distributor: No balance to withdraw')
        })

        it(`should emit a Withdraw event`, async () => {
            await paymentCoin.mintTo(distributor.target, alice.income*10000)
            await accessManager.grantRole(WITHDRAWER, alice.account.address, 0)
            await expect(distributor.connect(alice.account).withdraw())
                .to.emit(distributor, 'Withdrawal')
                .withArgs(alice.account.address, alice.income)
        })

        describe(`withdrawTo`, () => {
            beforeEach(async () => {
                await paymentCoin.mintTo(distributor.target, alice.income*10000)
            })

            it(`shouldn't be allowed to unauthorized accounts`, async () => {
                await expect(distributor.connect(bob.account).withdrawTo(alice.account.address)).to.be.revertedWithCustomError(distributor, 'AccessManagedUnauthorized')
            })

            it(`should be allowed to authorized accounts`, async () => {
                await accessManager.grantRole(PREAPPROVEDWITHDRAWER, bob.account.address, 0)
                await distributor.connect(bob.account).withdrawTo(alice.account.address)
            })

            it(`should emit a Withdraw event`, async () => {
                await accessManager.grantRole(PREAPPROVEDWITHDRAWER, bob.account.address, 0)
                await expect(distributor.connect(bob.account).withdrawTo(alice.account.address))
                    .to.emit(distributor, 'Withdrawal')
                    .withArgs(alice.account.address, alice.income)
            })

            it(`should withdraw on behalf of token holder`, async () => {
                await accessManager.grantRole(PREAPPROVEDWITHDRAWER, bob.account.address, 0)
                await expect(distributor.connect(bob.account).withdrawTo(alice.account.address))
                    .to.changeTokenBalance(paymentCoin, alice.account.address,alice.income * 10000)
            })
        })

        describe(`after alice has withdrawn her income, and another income has been added`, () => {
            beforeEach(async () => {
                await paymentCoin.mintTo(distributor.target, alice.income*10000)
                await accessManager.grantRole(WITHDRAWER, alice.account.address, 0)
                await distributor.connect(alice.account).withdraw()
                alice.withdraw()
                await addRandomIncome()
            })

            it("should return the right cumulative share", async () => {
                await checkTestersShare()
            })

            it("should transfer the right amount", async () => {
               await checkTestersWithdraw()
            })
        })

        describe(`after another income has been added`, () => {
            beforeEach(async () => {
                await addRandomIncome()
            })
            describe(`after alice has withdrawn her income, and another income has been added`, () => {
                beforeEach(async () => {
                    await paymentCoin.mintTo(distributor.target, alice.income*10000)
                    await accessManager.grantRole(WITHDRAWER, alice.account.address, 0)
                    await distributor.connect(alice.account).withdraw()
                    alice.withdraw()
                    await addRandomIncome()
                })

                it("should return the right cumulative share", async () => {
                    await checkTestersShare()
                })

                it("should transfer the right amount", async () => {
                    await checkTestersWithdraw()
                })
            })

            it("should return the right cumulative share", async () => {
                await checkTestersShare()
            })

            describe(`after computeCumulativeShare has been called before adding a new income`, () => {
                beforeEach(async () => {
                    await distributor.computeCumulativeShare(alice.account.address)
                    await addRandomIncome()
                })

                it("should return the right cumulative share", async () => {
                    await checkTestersShare()
                })
            })

            describe("after a lot of incomes have been added", () => {
                beforeEach(async () => {
                    for(let i=0; i<10; i++) {
                        await addRandomIncome()
                    }
                })

                it(`should return the right cumulative share`, async () => {
                    await checkTestersShare()
                })

                it("should transfer the right amount", async () => {
                    await checkTestersWithdraw()
                })
            })
        })
    })
})
