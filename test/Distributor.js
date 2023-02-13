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
        {name: "alice", account: 1},
        {name: "bob", account: 2},
        {name: "chris", account: 3}
    ]

    let incomes = Array.from({length: 40}, () => Math.floor(Math.random() * 100000000) + 2000);

    beforeEach(async () => {
        PaymentCoin = await ethers.getContractFactory("PaymentCoin");
        paymentCoin = await PaymentCoin.deploy('PaymentCoin', 'PCR')
        WhitelistToken = await ethers.getContractFactory("WhitelistToken");
        whitelistToken = await WhitelistToken.deploy('TestToken', 'TTK');
        Distributor = await ethers.getContractFactory("Distributor");
        distributor = await Distributor.deploy(whitelistToken.address, paymentCoin.address);
        accounts = await ethers.getSigners();
        [owner, alice, bob, chris, broker] = accounts;

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


    describe("once minted some tokens to alice, bob and chris, and added distributor as a token snapshooter", () => {
        beforeEach(async () => {
            await whitelistToken.addUserListToWhitelist([alice.address])
            await whitelistToken.mintTo(alice.address, 1500, 0)

            await whitelistToken.addUserListToWhitelist([bob.address])
            await whitelistToken.mintTo(bob.address, 5000, 0)

            await whitelistToken.addUserListToWhitelist([chris.address])
            await whitelistToken.mintTo(chris.address, 200, 0)

            const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
            await whitelistToken.grantRole(hashedSnapshotRole, distributor.address)
        })

        it("should trigger a snapshot on the token when adding an income", async () => {
            await expect(distributor.addIncome(incomes[0]))
                .to.emit(whitelistToken, 'Snapshot')
                .withArgs(1)
        })

        it("should not accept a 0 income", async () => {
            await expect(distributor.addIncome(0)).to.be.revertedWith('Distributor: amount has to be > 0')
        })

        it("should not accept a negative income", async () => {
            await expect(distributor.addIncome(-53)).to.be.reverted
        })

        it("should emit the IncomeAdded event when sucessfuly adding an income", async () => {
            await expect(distributor.addIncome(incomes[0]))
                .to.emit(distributor, 'IncomeAdded')
                .withArgs(incomes[0], 0)
        })

        it("should not allow a non-owner to add an income", async () => {
            await expect(distributor.connect(alice).addIncome(11000)).to.be.revertedWith('Ownable: caller is not the owner')
        })

        it("should not be able to compute cumulative share before at least one income has been added", async () => {
            await expect(distributor.computeCumulativeShare(alice.address)).to.be.reverted
        })

        it("should not be able to return a cumulative share before at least one income has been added", async () => {
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



        describe(`once a ${incomes[0]} income has been added`, () => {
            beforeEach(async () => {
                await distributor.addIncome(incomes[0])
            })

            it("should return a cumulative share of 0 for everybody before any share has been computed", async () => {
                let shareOfAlice = await distributor.cumulativeShareOf(alice.address)
                let shareOfBob = await distributor.cumulativeShareOf(bob.address)
                let shareOfChris = await distributor.cumulativeShareOf(chris.address)
                expect(shareOfAlice).to.equal(0)
                expect(shareOfBob).to.equal(0)
                expect(shareOfChris).to.equal(0)
            })

            it("should be able to compute cumulative share of alice", async () => {
                await distributor.computeCumulativeShare(alice.address)
            })

            testers.forEach(({name, account}) => {
                it(`should return the right cumulative share for ${name}`, async () => {
                    let address = accounts[account].address
                    let share = await whitelistToken.shareOfAt(address, 1)
                    await distributor.computeCumulativeShare(address)
                    let shareAmount = await distributor.cumulativeShareOf(address)
                    expect(shareAmount).to.equal(Math.floor(share * incomes[0]*100 / 1000000))
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
                    let share = await whitelistToken.shareOfAt(address, 1)
                    let expectedShareAmount = Math.floor(share * incomes[0]*100/1000000)
                    await paymentCoin.mintTo(distributor.address, expectedShareAmount * 10000)
                    expect(await paymentCoin.balanceOf(distributor.address)).to.equal(expectedShareAmount * 10000)

                    await expect(distributor.connect(accounts[account]).withdraw())
                        .to.emit(distributor, 'Withdrawal')
                        .withArgs(accounts[account].address, expectedShareAmount)
                    let shareAmount = await paymentCoin.balanceOf(accounts[account].address)
                    expect(shareAmount).to.equal(expectedShareAmount * 10000)
                })
            })

            it(`should reset balance to 0 after withdrawal`, async () => {
                await paymentCoin.mintTo(distributor.address, incomes[0]*100*10000)
                await distributor.connect(alice).withdraw()
                await expect(distributor.connect(alice).withdraw()).to.be.revertedWith('Distributor: No balance to withdraw')
            })

            describe(`after alice has withdrawn her income, and another income has been added`, () => {
                beforeEach(async () => {
                    await paymentCoin.mintTo(distributor.address, (incomes[0])*100*10000)
                    await distributor.connect(alice).withdraw()
                    await distributor.addIncome(incomes[1])
                })

                it("should transfer the right amount to alice", async () => {
                    await paymentCoin.mintTo(distributor.address, incomes[1]*100*10000)
                    let share = await whitelistToken.shareOfAt(alice.address, 2)
                    expectedAmount = Math.floor(share * incomes[1]*100 / 1000000)
                    let previousCoinBalance = await paymentCoin.balanceOf(alice.address)/10000
                    await distributor.connect(alice).withdraw()
                    expect(await paymentCoin.balanceOf(alice.address)/10000).to.equal(expectedAmount + previousCoinBalance)
                })


                it("should return the right cumulative share for alice", async () => {
                    await distributor.computeCumulativeShare(alice.address)
                    let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                    let expectedAmount = 0
                    i=1
                    let share = await whitelistToken.shareOfAt(alice.address, i+1)
                    expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                    expect(aliceShareAmount).to.equal(expectedAmount)
                })

            })

            describe(`after a ${incomes[1]} income has been added`, () => {
                beforeEach(async () => {
                    await distributor.addIncome(incomes[1])
                })
                describe(`after alice has withdrawn her income, and another income has been added`, () => {
                    beforeEach(async () => {
                        await paymentCoin.mintTo(distributor.address, (incomes[0]+incomes[1])*100*10000)
                        await distributor.connect(alice).withdraw()
                        await distributor.addIncome(incomes[2])
                    })

                    it("should transfer the right amount to alice", async () => {
                        await paymentCoin.mintTo(distributor.address, incomes[2]*100*10000)
                        let share = await whitelistToken.shareOfAt(alice.address, 3)
                        expectedAmount = Math.floor(share * incomes[2]*100 / 1000000)
                        let previousCoinBalance = await paymentCoin.balanceOf(alice.address)/10000
                        await distributor.connect(alice).withdraw()
                        expect(await paymentCoin.balanceOf(alice.address)/10000).to.equal(expectedAmount + previousCoinBalance)
                    })


                    it("should return the right cumulative share for alice", async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                        let expectedAmount = 0
                        i=2
                        let share = await whitelistToken.shareOfAt(alice.address, i+1)
                        expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                        expect(aliceShareAmount).to.equal(expectedAmount)
                    })

                })

                it("should return the right cumulative share for alice", async () => {
                    await distributor.computeCumulativeShare(alice.address)
                    let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                    let expectedAmount = 0
                    for(i=0; i<2; i++) {
                        let share = await whitelistToken.shareOfAt(alice.address, i+1)
                        expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                    }
                    expect(aliceShareAmount).to.equal(expectedAmount)
                })

                describe(`after computeCumulativeShare has been called before adding a ${incomes[2]} income`, () => {
                    beforeEach(async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        await distributor.addIncome(incomes[2])
                    })

                    it("should return the right cumulative share for alice", async () => {
                        await distributor.computeCumulativeShare(alice.address)
                        let aliceShareAmount = await distributor.cumulativeShareOf(alice.address)
                        let expectedAmount = 0
                        for(i=0; i<3; i++) {
                            let share = await whitelistToken.shareOfAt(alice.address, i+1)
                            expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                        }
                        expect(aliceShareAmount).to.equal(expectedAmount)
                    })


                })


                describe(`after a ${incomes[2]} income has been added and 1098 new tokens have been minted to bob`, () => {
                    beforeEach(async () => {
                        await distributor.addIncome(incomes[2])
                        await whitelistToken.mintTo(bob.address, 1098, 0)
                    })

                    testers.forEach(({name, account}) => {
                        it(`should return the right cumulative share for ${name}`, async () => {
                            let address = accounts[account].address
                            await distributor.computeCumulativeShare(address)
                            let shareAmount = await distributor.cumulativeShareOf(address)
                            let expectedAmount = 0

                            for(i=0; i<3; i++) {
                                let share = await whitelistToken.shareOfAt(address, i+1)
                                expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                            }
                            expect(shareAmount).to.equal(expectedAmount)
                        })
                    })

                    describe("after a large amount of new tokens have been minted to alice and a lot of incomes has been added", () => {
                        beforeEach(async () => {
                            await whitelistToken.mintTo(alice.address, 123456789, 0)
                            for(i=3; i<incomes.length; i++) {
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
            })

            describe(`after having burnt some of alice's tokens and after a ${incomes[1]} income has been added`, () => {
                beforeEach(async () => {
                    await whitelistToken.burn(alice.address, 547, 1)
                    await distributor.addIncome(incomes[1])
                })

                testers.forEach(({name, account}) => {
                    it(`should return the right cumulative share for ${name}`, async () => {
                        let address = accounts[account].address
                        await distributor.computeCumulativeShare(address)
                        let shareAmount = await distributor.cumulativeShareOf(address)

                        let expectedAmount = 0
                        for(i=0; i<2; i++) {
                            let share = await whitelistToken.shareOfAt(address, i+1)
                            expectedAmount += Math.floor(share * incomes[i]*100 / 1000000)
                        }
                        expect(shareAmount).to.equal(expectedAmount)
                    })
                })

            })

            describe(`after a ${incomes[1]} income has been added and after having burnt some of alice's tokens `, () => {
                beforeEach(async () => {
                    await distributor.addIncome(incomes[1])
                    await whitelistToken.burn(alice.address, 547, 1)
                })

                testers.forEach(({name, account}) => {
                    it(`should return the right cumulative share for ${name}`, async () => {
                        let address = accounts[account].address
                        await distributor.computeCumulativeShare(address)
                        let shareAmount = await distributor.cumulativeShareOf(address)

                        let expectedAmount = 0
                        for(i=0; i<2; i++) {
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