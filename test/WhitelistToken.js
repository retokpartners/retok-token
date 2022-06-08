const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("WhitelistToken", () => {
    let WhitelistToken
    let whitelistToken
    let owner
    let alice
    let bob
    let chris
    let broker

    beforeEach(async  () => {
        WhitelistToken = await ethers.getContractFactory("WhitelistToken");
        whitelistToken = await WhitelistToken.deploy('TestToken', 'TTK');
        [owner, alice, bob, chris, broker] = await ethers.getSigners();
    })

    describe("deployment", () => {
        it("should set the right owner", async function () {
            expect(await whitelistToken.owner()).to.equal(owner.address);
        })

        it("should set the owner as admin", async function () {
            expect(await whitelistToken.hasRole(ethers.utils.hexZeroPad("0x0", 32), owner.address)).to.be.true
        })
    })

    describe("access control", () => {
        // Transfer
        it("shouldn't allow non-owner to transfer ownership ", async () => {
            await expect(whitelistToken.connect(bob).transferOwnership(alice.address)).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("should allow the owner to transfer ownership ", async () => {
            await whitelistToken.transferOwnership(alice.address)
            newOwner = await whitelistToken.owner()
            expect(newOwner).to.equal(alice.address)
        })

        // Grant
        it("shouldn't allow non-owner to grant WHITELIST role", async () => {
            const hashedWhitelistRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("WHITELIST"));
            await expect(whitelistToken.connect(bob).grantRole(hashedWhitelistRole, alice.address)).to.be.reverted
        })

        it("shouldn't allow non-owner to grant SNAPSHOP role", async () => {
            const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
            await expect(whitelistToken.connect(bob).grantRole(hashedSnapshotRole, alice.address)).to.be.reverted
        })

        it("should allow owner to grant WHITELIST role", async () => {
            const hashedWhitelistRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("WHITELIST"));
            await whitelistToken.grantRole(hashedWhitelistRole, alice.address)
            expect(await whitelistToken.hasRole(hashedWhitelistRole, alice.address)).to.be.true
        })

        it("should allow owner to grant SNAPSHOP role", async () => {
            const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
            await whitelistToken.grantRole(hashedSnapshotRole, alice.address)
            expect(await whitelistToken.hasRole(hashedSnapshotRole, alice.address)).to.be.true
        })


        // Revoke
        it("shouldn't allow non-owner to revoke WHITELIST role", async () => {
            const hashedWhitelistRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("WHITELIST"));
            await whitelistToken.grantRole(hashedWhitelistRole, alice.address)
            await expect(whitelistToken.connect(bob).revokeRole(hashedWhitelistRole, alice.address)).to.be.reverted
        })

        it("shouldn't allow non-owner to revoke SNAPSHOP role", async () => {
            const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
            await whitelistToken.grantRole(hashedSnapshotRole, alice.address)
            await expect(whitelistToken.connect(bob).revokeRole(hashedSnapshotRole, alice.address)).to.be.reverted
        })

        it("should allow owner to revoke WHITELIST role", async () => {
            const hashedWhitelistRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("WHITELIST"));
            await whitelistToken.grantRole(hashedWhitelistRole, alice.address)
            await whitelistToken.revokeRole(hashedWhitelistRole, alice.address)
            expect(await whitelistToken.hasRole(hashedWhitelistRole, alice.address)).to.be.false
        })

        it("should allow owner to revoke SNAPSHOP role", async () => {
            const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
            await whitelistToken.grantRole(hashedSnapshotRole, alice.address)
            await whitelistToken.revokeRole(hashedSnapshotRole, alice.address)
            expect(await whitelistToken.hasRole(hashedSnapshotRole, alice.address)).to.be.false
        })
    })


    it("should have Name equals to `TestToken`", async () => {
        expect(await whitelistToken.name()).to.equal("TestToken")
    })

    it("should have Symbol equals to `TTK`", async () => {
        expect(await whitelistToken.symbol()).to.equal("TTK")
    })

    it("should have Decimals equals to 0", async () => {
        expect(await whitelistToken.decimals()).to.equal(0)
    })

    it("should throw the following error message when minted to a non-whitelisted address : TestToken: address is not in whitelist", async () => {
        await expect(whitelistToken.mintTo(alice.address, 10000, 0)).to.be.revertedWith("TestToken: address is not in whitelist")
    })

    it("should start with a total supply of 0", async () => {
        let initialTotalSupply = await whitelistToken.totalSupply()
        expect(initialTotalSupply).to.equal(0)
    })

    it("shouldn't allow a non-owner to mint", async () => {
        await whitelistToken.addUserListToWhitelist([alice.address])
        await expect(whitelistToken.connect(bob).mintTo(alice.address, 10000, 0)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    describe("once minted some tokens to alice", () => {
        beforeEach(async  () => {
            await whitelistToken.addUserListToWhitelist([alice.address])
            await whitelistToken.mintTo(alice.address, 1000000, 0)
        })

        it("should successfuly mint to a whitelisted address", async () => {
            let balanceOfAlice = await whitelistToken.balanceOf(alice.address)
            expect(balanceOfAlice).to.equal(1000000)
        })

        it("should add 1'000'000 to the total supply after minting this amount", async () => {
            let totalSupply = await whitelistToken.totalSupply()
            expect(totalSupply).to.equal(1000000)
        })

        it("should emit the Mint event when sucessfuly minting", async () => {
            await expect(whitelistToken.mintTo(alice.address, 1000000, 0))
                .to.emit(whitelistToken, 'Mint')
                .withArgs(alice.address, 1000000, 0)
        })

        it("should not allow transfers from alice to bob as bob is not on the whitelist", async () => {
            await expect(whitelistToken.connect(alice).transfer(bob.address, 250000)).to.be.revertedWith("TestToken: Transfer restriction detected. Please call detectTransferRestriction(address from, address to, uint256 value) for detailed information")
        })

        it("should allow transfers from alice to bob once bob's been added to the whitelist", async () => {
            await whitelistToken.addUserListToWhitelist([bob.address])
            await whitelistToken.connect(alice).transfer(bob.address, 250000)

            let balanceOfAlice = await whitelistToken.balanceOf(alice.address)
            let balanceOfBob = await whitelistToken.balanceOf(bob.address)
            expect(balanceOfAlice).to.equal(750000)
            expect(balanceOfBob).to.equal(250000)
        })

        it("should no longer allow transfers from alice to bob if bob is removed from the whitelist", async () => {
            await whitelistToken.addUserListToWhitelist([bob.address])
            await whitelistToken.removeUserFromWhitelist([bob.address])
            await expect(whitelistToken.connect(alice).transfer(bob.address, 250000)).to.be.revertedWith("TestToken: Transfer restriction detected. Please call detectTransferRestriction(address from, address to, uint256 value) for detailed information")
        })

        it("should no longer allow transfers from alice to bob if alice is removed from the whitelist", async () => {
            await whitelistToken.addUserListToWhitelist([bob.address])
            await whitelistToken.removeUserFromWhitelist([alice.address])
            await expect(whitelistToken.connect(alice).transfer(bob.address, 250000)).to.be.revertedWith("TestToken: Transfer restriction detected. Please call detectTransferRestriction(address from, address to, uint256 value) for detailed information")
        })


        it("should emit a Transfer Event if a transfer is succesful", async () => {
            await whitelistToken.addUserListToWhitelist([bob.address])
            await expect(whitelistToken.connect(alice).transfer(bob.address, 250000))
                .to.emit(whitelistToken, 'Transfer')
                .withArgs(alice.address, bob.address, 250000)
        })

        it("shouldn't allow a transfer by a third party if the allowance is not sufficient", async () => {
            await whitelistToken.addUserListToWhitelist([bob.address])
            await expect(whitelistToken.connect(broker).transferFrom(alice.address, bob.address, 2500)).to.be.revertedWith("ERC20: insufficient allowance")
        })

        it("should allow a transfer by a third party if the allowance is sufficient", async () => {
            await whitelistToken.addUserListToWhitelist([bob.address])
            await whitelistToken.connect(alice).increaseAllowance(broker.address, 2500)
            await whitelistToken.connect(broker).transferFrom(alice.address, bob.address, 2500)

            let balanceOfAlice = await whitelistToken.balanceOf(alice.address)
            let balanceOfBob = await whitelistToken.balanceOf(bob.address)
            let balanceOfBroker = await whitelistToken.balanceOf(broker.address)
            expect(balanceOfAlice).to.equal(997500)
            expect(balanceOfBob).to.equal(2500)
            expect(balanceOfBroker).to.equal(0)
        })

        it("should allow the owner to burn existing tokens with a valid code", async () => {
            await whitelistToken.burn(alice.address, 10000, 1)
            let balanceOfAlice = await whitelistToken.balanceOf(alice.address)
            let totalSupply = await whitelistToken.totalSupply()
            expect(balanceOfAlice).to.equal(990000)
            expect(totalSupply).to.equal(990000)
        })

        it("shouldn't allow a non-owner to burn tokens", async () => {
            await expect(whitelistToken.connect(alice).burn(alice.address, 10000, 1)).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("shouldn't allow to burn tokens with a non valid code", async () => {
            await expect(whitelistToken.burn(alice.address, 10000, 0)).to.be.revertedWith("TestToken: The code does not exist")
        })

        it("shouldn't allow to burn more tokens that there are", async () => {
            await expect(whitelistToken.burn(alice.address, 1000001, 1)).to.be.revertedWith("ERC20: burn amount exceeds balance")
        })

        describe('snapshots', async () => {
            it("shouldn't allow non-snapshoters to trigger snapshots", async () => {
                await expect(whitelistToken.snapshot()).to.be.revertedWith("TestToken: sender is not allowed to take snapshots")
            })

            it("should allow snapshoters to trigger snapshots", async () => {
                const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
                await whitelistToken.grantRole(hashedSnapshotRole, chris.address)
                await whitelistToken.connect(chris).snapshot()
            })

            it("should emit a snapshot event when triggering a snapshot", async () => {
                const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
                await whitelistToken.grantRole(hashedSnapshotRole, chris.address)
                await expect(whitelistToken.connect(chris).snapshot())
                    .to.emit(whitelistToken, 'Snapshot')
                    .withArgs(1)
            })

            it("should return snapshot states", async () => {
                const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));
                await whitelistToken.grantRole(hashedSnapshotRole, chris.address)
                await whitelistToken.connect(chris).snapshot()
                await whitelistToken.burn(alice.address, 10000, 1)
                await whitelistToken.mintTo(alice.address, 5000, 0)

                expect(await whitelistToken.totalSupply()).to.equal(995000)
                expect(await whitelistToken.balanceOf(alice.address)).to.equal(995000)

                expect(await whitelistToken.totalSupplyAt(1)).to.equal(1000000)
                expect(await whitelistToken.balanceOfAt(alice.address, 1)).to.equal(1000000)
            })

            it("should return the share, in millionth, of a tokenholder at a given snapshot", async () => {
                const hashedSnapshotRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SNAPSHOT"));

                // At first snapshot, alice has 100% of shares (1'000'000 / 1'000'000)
                await whitelistToken.grantRole(hashedSnapshotRole, chris.address)
                await whitelistToken.connect(chris).snapshot()
                expect(await whitelistToken.shareOfAt(alice.address, 1)).to.equal(1 * 1000000)

                // At second snapshot, total supply still == alice shares
                await whitelistToken.burn(alice.address, 10000, 1)
                await whitelistToken.connect(chris).snapshot()
                expect(await whitelistToken.shareOfAt(alice.address, 2)).to.equal(1 * 1000000)

                // At third snapshot, bob has a partial share
                await whitelistToken.addUserListToWhitelist([bob.address])
                await whitelistToken.mintTo(bob.address, 5000000000, 0)
                await whitelistToken.connect(chris).snapshot()

                let totalSupply = await whitelistToken.totalSupplyAt(3);
                let aliceBalance = await whitelistToken.balanceOfAt(alice.address, 3)
                let bobBalance = await whitelistToken.balanceOfAt(bob.address, 3)

                expect(await whitelistToken.shareOfAt(alice.address, 3)).to.equal(Math.floor(aliceBalance * 1000000 / totalSupply))
                expect(await whitelistToken.shareOfAt(bob.address, 3)).to.equal(Math.floor(bobBalance * 1000000 / totalSupply))
            })

        })
    })
})