const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("Distributor", () => {
    let Distributor
    let distributor

    let WhitelistToken
    let whitelistToken

    let accounts
    let owner
    let alice
    let bob
    let chris
    let broker
    let testers = [
        {name: "alice", account: 1, snapshotIdx: 1},
        {name: "bob", account: 2, snapshotIdx: 0},
        {name: "chris", account: 3, snapshotIdx: 2}
    ]

    let incomes = Array.from({length: 10}, () => Math.floor(Math.random() * 100000000) + 2000);
    let totalIncome = incomes.reduce((acc, income) => { return acc += income}, 0)

    beforeEach(async () => {
        PaymentCoin = await ethers.getContractFactory("PaymentCoin");
        paymentCoin = await PaymentCoin.deploy('PaymentCoin', 'PCR')
        WhitelistToken = await ethers.getContractFactory("MockWhitelistToken");
        whitelistToken = await WhitelistToken.deploy();
        Distributor = await ethers.getContractFactory("Distributor");
        distributor = await Distributor.deploy(whitelistToken.address, paymentCoin.address, incomes.slice(0,3));
        accounts = await ethers.getSigners();
        [owner, alice, bob, chris, broker] = accounts;

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

        for(i=0; i < incomes.length; i++) {
            let shares = generate(1000000, testers.length)
            for(j=0; j < testers.length; j++) {
                account = accounts[testers[j].account];
                await whitelistToken.setShareOfAt(account.address, i+1, shares[j])
            }
        }
    })

    describe("deployment", () => {
        it("should set the right owner", async function () {
            expect(await distributor.owner()).to.equal(owner.address);
        })

        // Transfer
        it("shouldn't allow non-owner to transfer ownership ", async () => {
            await expect(distributor.connect(bob).transferOwnership(alice.address)).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("should allow the owner to transfer ownership ", async () => {
            await distributor.transferOwnership(alice.address)
            newOwner = await distributor.owner()
            expect(newOwner).to.equal(alice.address)
        })
    })

    describe("initIncome", () => {
        it("shouldn't allow non-owner to initialize income", async () => {
            await expect(distributor.connect(bob).initIncome(alice.address, 1)).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("should allow the owner to initialize an income", async () => {
            await distributor.initIncome(alice.address, 2)
        })

        it("shouldn't accept a snapshotIdx > TotalIncome length", async () => {
            await expect(distributor.initIncome(alice.address, 11)).to.be.revertedWith("Distributor: Cannot set snapshotIdx > TotalIncomes length")
        })

        it("shouldn't allow to reinitialize an income", async () => {
            await distributor.initIncome(alice.address, 1)
            await expect(distributor.initIncome(alice.address, 2)).to.be.revertedWith("Distributor: Cannot set already initialized income")
        })
    })

    describe("once minted some tokens to alice, bob and chris", () => {
        beforeEach(async () => {
            await whitelistToken.addUserListToWhitelist([alice.address])
            await whitelistToken.mintTo(alice.address, 1500, 0)

            await whitelistToken.addUserListToWhitelist([bob.address])
            await whitelistToken.mintTo(bob.address, 5000, 0)

            await whitelistToken.addUserListToWhitelist([chris.address])
            await whitelistToken.mintTo(chris.address, 200, 0)
        })

        it("should trigger a snapshot on the token when adding an income", async () => {
            await expect(distributor.addIncome(incomes[0]))
                .to.emit(whitelistToken, 'Snapshot')
        })

        it("should not accept a 0 income", async () => {
            await expect(distributor.addIncome(0)).to.be.revertedWith('Distributor: amount has to be > 0')
        })

        it("should not accept a negative income", async () => {
            await expect(distributor.addIncome(-53)).to.be.reverted
        })

        it("should emit the IncomeAdded event when sucessfuly adding an income", async () => {
            await expect(distributor.addIncome(incomes[3]))
                .to.emit(distributor, 'IncomeAdded')
                .withArgs(incomes[3], 3)
        })

        it("should not allow a non-owner to add an income", async () => {
            await expect(distributor.connect(alice).addIncome(11000)).to.be.revertedWith('Ownable: caller is not the owner')
        })

        it("should not be able to compute cumulative share before at least one income has been added", async () => {
            distributor = await Distributor.deploy(whitelistToken.address, paymentCoin.address, []);
            await expect(distributor.computeCumulativeShare(alice.address)).to.be.reverted
        })

        it("should not be able to return a cumulative share before at least one income has been added", async () => {
            distributor = await Distributor.deploy(whitelistToken.address, paymentCoin.address, []);
            await expect(distributor.cumulativeShareOf(alice.address)).to.be.reverted
        })

        it("should allow the owner to transfer funds out of the contract", async () => {
            await paymentCoin.mintTo(distributor.address, 100000)
            await distributor.transferToOwner(100000)
            expect(await paymentCoin.balanceOf(owner.address)).to.equal(100000)
        })

        it("should not allow the owner to transfer more funds out of the contract than there is available", async () => {
            await paymentCoin.mintTo(distributor.address, 100000)
            await expect(distributor.transferToOwner(100001)).to.be.revertedWith("Distributor: Contract doesn't have sufficient fund")
        })

        it("should not allow a non-owner to transfer funds out of the contract", async () => {
            await paymentCoin.mintTo(distributor.address, 100000)
            await expect(distributor.connect(alice).transferToOwner(100000)).to.be.revertedWith('Ownable: caller is not the owner')
        })

        describe(`once a ${incomes[3]} income has been added`, () => {
            beforeEach(async () => {
                await distributor.addIncome(incomes[3])
            })

            it("should not return a cumulative share before any share has been computed", async () => {
                await expect(distributor.cumulativeShareOf(alice.address)).to.be.revertedWith('Distributor: Call computeCumulativeShare first to update share')
            })

            it("should be able to compute cumulative share of alice", async () => {
                await distributor.computeCumulativeShare(alice.address)
            })

            testers.forEach(({name, account}) => {
                it(`should return the right cumulative share for ${name}`, async () => {
                    let address = accounts[account].address

                    let expectedAmount = 0
                    // Previous incomes
                    for(i=0; i<3; i++) {
                        let share = await whitelistToken.shareOfAt(address, i+1)
                        expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                    }

                    // New income
                    for(i=3; i<4; i++) {
                        let share = await whitelistToken.shareOfAt(address, i+1)
                        expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                    }
                    await distributor.computeCumulativeShare(address)
                    let shareAmount = await distributor.cumulativeShareOf(address)
                    expect(shareAmount).to.equal(Math.floor(expectedAmount))
                })
            })

            // Withdrawal
            it(`should not allow withdrawal if the sender has no balance available`, async () => {
                await whitelistToken.addUserListToWhitelist([broker.address])
                await expect(distributor.connect(broker).withdraw()).to.be.revertedWith("Distributor: No balance to withdraw")
            })

            it(`should not allow withdrawal if the sender is not whitelisted`, async () => {
                await whitelistToken.removeUserFromWhitelist([alice.address])
                await expect(distributor.connect(alice).withdraw()).to.be.revertedWith("Distributor: sender is restricted")
            })

            it(`should not allow withdrawal if the contract is underfunded`, async () => {
                await expect(distributor.connect(alice).withdraw()).to.be.revertedWith("Distributor: Contract doesn't have sufficient fund")
            })

            testers.forEach(({name, account}) => {
                it(`should allow ${name} to withdraw their balance`, async () => {
                    let address = accounts[account].address

                    let expectedAmount = 0
                    for(i=0; i<4; i++) {
                        let share = await whitelistToken.shareOfAt(address, i+1)
                        expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                    }

                    await paymentCoin.mintTo(distributor.address, expectedAmount * 10000)
                    expect(await paymentCoin.balanceOf(distributor.address)).to.equal(expectedAmount * 10000)

                    await expect(distributor.connect(accounts[account]).withdraw())
                        .to.emit(distributor, 'Withdrawal')
                        .withArgs(address, expectedAmount)
                    let shareAmount = await paymentCoin.balanceOf(address)
                    expect(shareAmount).to.equal(expectedAmount * 10000)
                })
            })

            it(`should reset balance to 0 after withdrawal`, async () => {
                await paymentCoin.mintTo(distributor.address, totalIncome*100*10000)
                await distributor.connect(alice).withdraw()
                await expect(distributor.connect(alice).withdraw()).to.be.revertedWith('Distributor: No balance to withdraw')
            })

            describe(`after alice has withdrawn her income, and another income has been added`, () => {
                beforeEach(async () => {
                    await paymentCoin.mintTo(distributor.address, totalIncome*100*10000)
                    await distributor.connect(alice).withdraw()
                    await distributor.addIncome(incomes[4])
                })

                it("should return the right cumulative share for alice", async () => {
                    await distributor.computeCumulativeShare(alice.address)
                    let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                    let share = await whitelistToken.shareOfAt(alice.address, 4+1)
                    expectedAmount = Math.floor(share * incomes[4]*100 / 1000000)
                    expect(aliceShareAmount).to.equal(expectedAmount)
                })

                it("should transfer the right amount to alice", async () => {
                    let share = await whitelistToken.shareOfAt(alice.address, 4+1)
                    expectedAmount = Math.floor(share * incomes[4]*100 / 1000000)
                    let previousCoinBalance = await paymentCoin.balanceOf(alice.address)/10000
                    await distributor.connect(alice).withdraw()
                    expect(await paymentCoin.balanceOf(alice.address)/10000).to.equal(expectedAmount + previousCoinBalance)
                })
            })

            describe(`after a ${incomes[4]} income has been added`, () => {
                beforeEach(async () => {
                    await distributor.addIncome(incomes[4])
                })
                describe(`after alice has withdrawn her income, and another income has been added`, () => {
                    beforeEach(async () => {
                        await paymentCoin.mintTo(distributor.address, totalIncome*100*10000)
                        await distributor.connect(alice).withdraw()
                        await distributor.addIncome(incomes[5])
                    })

                    it("should return the right cumulative share for alice", async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                        let share = await whitelistToken.shareOfAt(alice.address, 5+1)
                        expectedAmount = Math.floor(share * incomes[5]*100 / 1000000)
                        expect(aliceShareAmount).to.equal(expectedAmount)
                    })

                    it("should transfer the right amount to alice", async () => {
                        let share = await whitelistToken.shareOfAt(alice.address, 5+1)
                        expectedAmount = Math.floor(share * incomes[5]*100 / 1000000)
                        let previousCoinBalance = await paymentCoin.balanceOf(alice.address)/10000
                        await distributor.connect(alice).withdraw()
                        expect(await paymentCoin.balanceOf(alice.address)/10000).to.equal(expectedAmount + previousCoinBalance)
                    })
                })

                it("should return the right cumulative share for alice", async () => {
                    await distributor.computeCumulativeShare(alice.address)
                    let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                    let expectedAmount = 0
                    for(i=0; i<5; i++) {
                        let share = await whitelistToken.shareOfAt(alice.address, i+1)
                        expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                    }
                    expect(aliceShareAmount).to.equal(expectedAmount)
                })

                describe(`after computeCumulativeShare has been called before adding a ${incomes[5]} income`, () => {
                    beforeEach(async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        await distributor.addIncome(incomes[5])
                    })

                    it("should return the right cumulative share for alice", async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                        let expectedAmount = 0
                        for(i=0; i<6; i++) {
                            let share = await whitelistToken.shareOfAt(alice.address, i+1)
                            expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                        }
                        expect(aliceShareAmount).to.equal(expectedAmount)
                    })
                })

                describe("after a lot of incomes has been added", () => {
                    beforeEach(async () => {
                        for(i=5; i<incomes.length; i++) {
                            await distributor.addIncome(incomes[i])
                        }
                    })

                    testers.forEach(({name, account}) => {
                        it(`should return the right cumulative share for ${name}`, async () => {
                            let address = accounts[account].address
                            await distributor.computeCumulativeShare(address)
                            let shareAmount = await distributor.cumulativeShareOf(address)

                            let expectedAmount = 0
                            for(i=0; i<incomes.length; i++) {
                                let share = await whitelistToken.shareOfAt(address, i+1)
                                expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                            }
                            expect(shareAmount).to.equal(expectedAmount)
                        })
                    })
                })
            })

            describe(`after a ${incomes[4]} income has been added and after having set previous incomes `, () => {
                beforeEach(async () => {
                    await distributor.addIncome(incomes[4])
                    for(j=0; j < testers.length; j++) {
                        account = accounts[testers[j].account];
                        await distributor.initIncome(account.address, testers[j].snapshotIdx)
                    }
                })

                testers.forEach(({name, account, snapshotIdx}) => {
                    it(`should return the right cumulative share for ${name}`, async () => {
                        let address = accounts[account].address
                        await distributor.computeCumulativeShare(address)
                        let shareAmount = await distributor.cumulativeShareOf(address)

                        let expectedAmount = 0
                        for(i=snapshotIdx+1; i<5; i++) {
                            let share = await whitelistToken.shareOfAt(address, i+1)
                            expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                        }
                        expect(shareAmount).to.equal(expectedAmount)
                    })
                })

                describe(`after alice has withdrawn her income, and another income has been added`, () => {
                    beforeEach(async () => {
                        await paymentCoin.mintTo(distributor.address, totalIncome*100*10000)
                        await distributor.connect(alice).withdraw()
                        await distributor.addIncome(incomes[5])
                    })

                    it("should return the right cumulative share for alice", async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                        let share = await whitelistToken.shareOfAt(alice.address, 5+1)
                        expectedAmount = Math.floor(share * incomes[5]*100 / 1000000)
                        expect(aliceShareAmount).to.equal(expectedAmount)
                    })

                    it("should transfer the right amount to alice", async () => {
                        let share = await whitelistToken.shareOfAt(alice.address, 5+1)
                        expectedAmount = Math.floor(share * incomes[5]*100 / 1000000)
                        let previousCoinBalance = await paymentCoin.balanceOf(alice.address)/10000
                        await distributor.connect(alice).withdraw()
                        expect(await paymentCoin.balanceOf(alice.address)/10000).to.equal(expectedAmount + previousCoinBalance)
                    })
                })

                describe(`after computeCumulativeShare has been called before adding a ${incomes[5]} income`, () => {
                    beforeEach(async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        await distributor.addIncome(incomes[5])
                    })

                    testers.forEach(({name, account, snapshotIdx}) => {
                        it(`should return the right cumulative share for ${name}`, async () => {
                            let address = accounts[account].address
                            await distributor.computeCumulativeShare(address)
                            let shareAmount = await distributor.cumulativeShareOf(address)

                            let expectedAmount = 0
                            for(i=snapshotIdx+1; i<6; i++) {
                                let share = await whitelistToken.shareOfAt(address, i+1)
                                expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                            }
                            expect(shareAmount).to.equal(expectedAmount)
                        })
                    })
                })


            })
        })
    })
})