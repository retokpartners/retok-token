// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract PythSwap is Ownable {
    using SafeERC20 for IERC20;
    IPyth pyth;
    IERC20 inputToken;
    IERC20 outputToken;
    bytes32 priceId;

    constructor(address pythContract,
                address inputTokenContract,
                address outputTokenContract,
                bytes32 _priceId) {
        pyth = IPyth(pythContract);
        inputToken = IERC20(inputTokenContract);
        outputToken = IERC20(outputTokenContract);
        priceId = _priceId;
    }

    // Swap ERC20 token for another, in amounts based on price from Pythnet
    function swap(uint256 inputAmount, bytes[] calldata priceUpdateData) public payable {
        require(inputAmount > 0, "PythSwap: inputAmount has to be > 0");
        require(inputToken.balanceOf(msg.sender) >= inputAmount, "PythSwap: Sender doesn't have sufficient fund");

        // Update pythnet and get the last price
        PythStructs.Price memory price = updatePythnet(priceUpdateData);

        // Compute outputAmount from input and price
        uint256 outputAmount = computeOutputAmount(price, inputAmount);

        require(outputToken.balanceOf(address(this)) >= outputAmount, "PythSwap: Contract doesn't have sufficient fund");
        inputToken.safeTransferFrom(msg.sender, address(this), inputAmount);
        outputToken.safeTransfer(msg.sender, outputAmount);
        emit Swap(msg.sender, inputAmount, outputAmount);
    }

    function updatePythnet(bytes[] calldata priceUpdateData) public payable returns (PythStructs.Price memory price) {
        uint fee = pyth.getUpdateFee(priceUpdateData);
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        price = pyth.getPrice(priceId);
    }

    function computeOutputAmount(PythStructs.Price memory price, uint256 inputAmount) public pure returns (uint256) {
        uint64 uprice = uint64(price.price);
        uint32 uexpo = uint32(-price.expo);
        uint256 outputAmount = Math.mulDiv(inputAmount, uprice, 10**uexpo);
        return outputAmount;
    }

    // Transfer funds out of the contract to its owner
    function _transferToOwner(address coinAddress, uint256 amount) internal {
        IERC20 coin = IERC20(coinAddress);
        require(coin.balanceOf(address(this)) >= amount, "PythSwap: Contract doesn't have sufficient fund");
        coin.safeTransfer(owner(), amount);
    }

    function transferToOwner(address coinAddress,uint256 amount) external onlyOwner {
        _transferToOwner(coinAddress, amount);
    }

    // EVENTS
    /**
     * Emitted when an `inputAmount` is swapped for 'outputAmount' by `sender`
     */
    event Swap(address sender, uint256 inputAmount, uint256 outputAmount);
}
