const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("PythSwap", () => {
    let PythSwap
    let pyth_swap

    let MockPyth
    let mock_pyth

    let priceId
    let price
    let priceFeedUpdateData

    const initialBalance = 10000 * 10**8
    let inputAmount

    let TokenContract
    let input_token
    let output_token

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


    beforeEach(async () => {
        TokenContract = await ethers.getContractFactory("PaymentCoin")
        input_token = await TokenContract.deploy('InputCoin', 'INC');
        output_token = await TokenContract.deploy('OutputCoin', 'OUTC');

        MockPyth = await ethers.getContractFactory("MockPyth");
        mock_pyth = await MockPyth.deploy(100000, 10);

        priceId = '0x67a6f93030420c1c9e3fe37c1ab6b77966af82f995944a9fefce357a22854a80';

        price = {
            expo: '-5',
            conf: '1500',
            price: '12276250',
            publishTime: Math.floor(Date.now() / 1000).toString()
        }

        PythSwap = await ethers.getContractFactory("PythSwap");
        pyth_swap = await PythSwap.deploy(mock_pyth.address, input_token.address, output_token.address, priceId);

        accounts = await ethers.getSigners();
        [owner, alice, bob, chris, broker] = accounts;

        inputAmount = Math.floor(Math.random() * 10**8)

    })

    describe("deployment", () => {
        it("should set the right owner", async function () {
            expect(await pyth_swap.owner()).to.equal(owner.address)
        })

        // Transfer
        it("shouldn't allow non-owner to transfer ownership ", async () => {
            await expect(pyth_swap.connect(bob).transferOwnership(alice.address)).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("should allow the owner to transfer ownership ", async () => {
            await pyth_swap.transferOwnership(alice.address)
            newOwner = await pyth_swap.owner()
            expect(newOwner).to.equal(alice.address)
        })
    })

    describe("updatePythnet", () => {
        it("should update price feed on Pythnet", async () => {
            _now = Math.floor(Date.now() / 1000)
            priceFeedUpdateData = await mock_pyth.createPriceFeedUpdateData(
                priceId,              // id
                price.price,          // price
                price.conf,           // conf
                price.expo,           // expo
                price.price,          // ema price
                price.conf,           // ema conf
                price.publishTime     // publishTime
            );

            expect(await pyth_swap.updatePythnet([priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") }))
                .to.emit(MockPyth, 'PriceFeedUpdate')
        })
    })

    describe("computeOutputAmount", () => {
        it("should return the input amount multiplied by the price", async () => {
            const outputAmount = Math.floor(inputAmount * price.price / 10**-price.expo)
            expect(await pyth_swap.computeOutputAmount(price, inputAmount))
                .to.equal(outputAmount)
        })
    })

    describe("swap", () => {
        beforeEach(async () => {
            _now = Math.floor(Date.now() / 1000).toString()
            price = {
                expo: '-5',
                conf: '1500',
                price: '12276250',
                publishTime: _now
            }

            priceFeedUpdateData = await mock_pyth.createPriceFeedUpdateData(
                priceId,              // id
                price.price,          // price
                price.conf,           // conf
                price.expo,           // expo
                price.price,          // ema price
                price.conf,           // ema conf
                price.publishTime     // publishTime
            );
        })

        it("should fail if inputAmount is null", async () => {
            await expect(pyth_swap.swap(0, [priceFeedUpdateData]))
                .to.be.revertedWith("PythSwap: inputAmount has to be > 0")
        })

        it("should fails if sender doesn't have enough inputToken", async () => {
            await expect(pyth_swap.swap(100, [priceFeedUpdateData]))
                .to.be.revertedWith("PythSwap: Sender doesn't have sufficient fund")
        })

        it("should fails if contract doesn't have enough outputToken", async () => {
            await input_token.mintTo(owner.address, 100)
            await expect(pyth_swap.swap(100, [priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") }))
                .to.be.revertedWith("PythSwap: Contract doesn't have sufficient fund")
        })

        it("should fails if contract doesn't have enough outputToken", async () => {
            await input_token.mintTo(owner.address, 100)
            await expect(pyth_swap.swap(100, [priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") }))
                .to.be.revertedWith("PythSwap: Contract doesn't have sufficient fund")
        })

        describe("when everything's set", () => {
            beforeEach(async () => {
                await input_token.mintTo(alice.address, initialBalance)
                await output_token.mintTo(pyth_swap.address, initialBalance)
                await input_token.connect(alice).approve(pyth_swap.address, inputAmount)
            })

            it("should emit a Swap event", async () => {
                expect (await pyth_swap.connect(alice).swap(inputAmount, [priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") }))
                    .to.emit(PythSwap, 'Swap')
            })

            it("should reduce sender inputToken balance by inputAmount", async () => {
                await pyth_swap.connect(alice).swap(inputAmount, [priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") })
                expect (await input_token.balanceOf(alice.address)).to.equal(initialBalance - inputAmount)
            })

            it("should increase contract inputToken balance by inputAmount", async () => {
                await pyth_swap.connect(alice).swap(inputAmount, [priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") })
                expect (await input_token.balanceOf(pyth_swap.address)).to.equal(inputAmount)
            })

            it("should increase sender outputToken balance by outputAmount", async () => {
                await pyth_swap.connect(alice).swap(inputAmount, [priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") })
                const outputAmount = Math.floor(inputAmount * price.price / 10**-price.expo)
                expect (await output_token.balanceOf(alice.address)).to.equal(outputAmount)
            })

            it("should decrease contract outputToken balance by outputAmount", async () => {
                await pyth_swap.connect(alice).swap(inputAmount, [priceFeedUpdateData], { value: ethers.utils.parseUnits("10", "wei") })
                const outputAmount = Math.floor(inputAmount * price.price / 10**-price.expo)
                expect (await output_token.balanceOf(pyth_swap.address)).to.equal(initialBalance - outputAmount)
            })
        })
    })
})