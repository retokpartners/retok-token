const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("SnapshotToken", () => {
    let AccessManager
    let accessManager
    let SnapshotToken
    let snapshotToken
    let owner
    let alice
    let bob
    let chris
    let broker

    // Roles
    const OWNER = 10n
    const SNAPSHOOTER = 40n

    beforeEach(async  () => {
        [owner, alice, bob, chris, broker] = await ethers.getSigners();
        AccessManager = await ethers.getContractFactory("AccessManager");
        accessManager = await AccessManager.deploy(owner.address)

        SnapshotToken = await ethers.getContractFactory("SnapshotToken");
        snapshotToken = await SnapshotToken.deploy('TestToken', 'TTK', accessManager.address);

        // Roles and permissions
        await accessManager.grantRole(OWNER, owner.address, 0)
        await accessManager.setTargetFunctionRole(
            snapshotToken.address,
            [
                ethers.utils.id('burn(address,uint256,uint8)').substring(0, 10),
                ethers.utils.id('mintTo(address,uint256,uint8)').substring(0, 10)
            ],
            OWNER
       )

    })

    it("should have Name equals to `TestToken`", async () => {
        expect(await snapshotToken.name()).to.equal("TestToken")
    })

    it("should have Symbol equals to `TTK`", async () => {
        expect(await snapshotToken.symbol()).to.equal("TTK")
    })

    it("should have Decimals equals to 6", async () => {
        expect(await snapshotToken.decimals()).to.equal(6)
    })

    it("should start with a total supply of 0", async () => {
        let initialTotalSupply = await snapshotToken.totalSupply()
        expect(initialTotalSupply).to.equal(0)
    })

    it("shouldn't allow a non-owner to mint", async () => {
        await expect(snapshotToken.connect(bob).mintTo(alice.address, 10000, 0)).to.be.revertedWith("AccessManagedUnauthorized")
    })

    describe("once minted some tokens to alice", () => {
        beforeEach(async  () => {
            await snapshotToken.mintTo(alice.address, 1000000, 0)
        })

        it("should successfuly mint", async () => {
            let balanceOfAlice = await snapshotToken.balanceOf(alice.address)
            expect(balanceOfAlice).to.equal(1000000)
        })

        it("should add 1'000'000 to the total supply after minting this amount", async () => {
            let totalSupply = await snapshotToken.totalSupply()
            expect(totalSupply).to.equal(1000000)
        })

        it("should emit the Mint event when sucessfuly minting", async () => {
            await expect(snapshotToken.mintTo(alice.address, 1000000, 0))
                .to.emit(snapshotToken, 'Mint')
                .withArgs(alice.address, 1000000, 0)
        })


        it("should emit a Transfer Event if a transfer is succesful", async () => {
            await expect(snapshotToken.connect(alice).transfer(bob.address, 250000))
                .to.emit(snapshotToken, 'Transfer')
                .withArgs(alice.address, bob.address, 250000)
        })

        it("shouldn't allow a transfer by a third party if the allowance is not sufficient", async () => {
            await expect(snapshotToken.connect(broker).transferFrom(alice.address, bob.address, 2500)).to.be.revertedWith("ERC20InsufficientAllowance")
        })

        it("should allow a transfer by a third party if the allowance is sufficient", async () => {
            await snapshotToken.connect(alice).approve(broker.address, 2500)
            await snapshotToken.connect(broker).transferFrom(alice.address, bob.address, 2500)

            let balanceOfAlice = await snapshotToken.balanceOf(alice.address)
            let balanceOfBob = await snapshotToken.balanceOf(bob.address)
            let balanceOfBroker = await snapshotToken.balanceOf(broker.address)
            expect(balanceOfAlice).to.equal(997500)
            expect(balanceOfBob).to.equal(2500)
            expect(balanceOfBroker).to.equal(0)
        })

        it("should allow the owner to burn existing tokens with a valid code", async () => {
            await snapshotToken.burn(alice.address, 10000, 1)
            let balanceOfAlice = await snapshotToken.balanceOf(alice.address)
            let totalSupply = await snapshotToken.totalSupply()
            expect(balanceOfAlice).to.equal(990000)
            expect(totalSupply).to.equal(990000)
        })

        it("shouldn't allow a non-owner to burn tokens", async () => {
            await expect(snapshotToken.connect(alice).burn(alice.address, 10000, 1)).to.be.revertedWith("AccessManagedUnauthorized")
        })

        it("shouldn't allow to burn tokens with a non valid code", async () => {
            await expect(snapshotToken.burn(alice.address, 10000, 0)).to.be.revertedWith("TestToken: The code does not exist")
        })

        it("shouldn't allow to burn more tokens that there are", async () => {
            await expect(snapshotToken.burn(alice.address, 1000001, 1)).to.be.revertedWith("panic code 0x11")
        })

        describe('snapshots', async () => {
            beforeEach(async  () => {

              // Roles and permissions
              await accessManager.grantRole(SNAPSHOOTER, chris.address, 0)
              await accessManager.setTargetFunctionRole(
                snapshotToken.address,
                [
                    ethers.utils.id('snapshot()').substring(0, 10)
                ],
                SNAPSHOOTER
              )
            })

            it("shouldn't allow non-snapshoters to trigger snapshots", async () => {
                await expect(snapshotToken.snapshot()).to.be.revertedWith("AccessManagedUnauthorized")
            })

            it("should allow snapshoters to trigger snapshots", async () => {
                await snapshotToken.connect(chris).snapshot()
            })

            it("should emit a snapshot event when triggering a snapshot", async () => {
                await expect(snapshotToken.connect(chris).snapshot())
                    .to.emit(snapshotToken, 'ERC20SnapshotCheckpointed')
                    .withArgs(0)
            })

            it("should return snapshot states", async () => {
                await snapshotToken.connect(chris).snapshot()
                await snapshotToken.burn(alice.address, 10000, 1)
                await snapshotToken.mintTo(alice.address, 5000, 0)

                expect(await snapshotToken.totalSupply()).to.equal(995000)
                expect(await snapshotToken.balanceOf(alice.address)).to.equal(995000)

                expect(await snapshotToken.totalSupplyAt(0)).to.equal(1000000)
                expect(await snapshotToken.balanceOfAt(alice.address, 0)).to.equal(1000000)
            })

            it("should return the share, in millionth, of a tokenholder at a given snapshot", async () => {

                // At first snapshot, alice has 100% of shares (1'000'000 / 1'000'000)
                await snapshotToken.connect(chris).snapshot()
                expect(await snapshotToken.shareOfAt(alice.address, 0)).to.equal(1 * 1000000)

                // At second snapshot, total supply still == alice shares
                await snapshotToken.burn(alice.address, 10000, 1)
                await snapshotToken.connect(chris).snapshot()
                expect(await snapshotToken.shareOfAt(alice.address, 1)).to.equal(1 * 1000000)

                // At third snapshot, bob has a partial share
                await snapshotToken.mintTo(bob.address, 5000000000, 0)
                await snapshotToken.connect(chris).snapshot()

                let totalSupply = await snapshotToken.totalSupplyAt(2);
                let aliceBalance = await snapshotToken.balanceOfAt(alice.address, 2)
                let bobBalance = await snapshotToken.balanceOfAt(bob.address, 2)

                expect(await snapshotToken.shareOfAt(alice.address, 2)).to.equal(Math.floor(aliceBalance * 1000000 / totalSupply))
                expect(await snapshotToken.shareOfAt(bob.address, 2)).to.equal(Math.floor(bobBalance * 1000000 / totalSupply))
            })

        })
    })
})