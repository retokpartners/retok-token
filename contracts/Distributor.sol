// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IWhitelistToken.sol";

contract Distributor is Ownable {
    using SafeERC20 for IERC20;

    struct Income {
        bool   present;
        uint16 snapshotIdx; // == snapshotId - 1
        uint40 amount;
    }

    address private _tokenAddress;
    address private _coinAddress;
    uint40[] private _TotalIncomes;
    mapping(address => Income) private _splitIncomes;
    mapping(address => uint40) private _withdrawals;

    constructor(address tokenAddress, address coinAddress) {
        _tokenAddress = tokenAddress;
        _coinAddress = coinAddress; // Coin used for income payment
    }

    // Income and share computation
    function _addIncome(uint40 amount) internal {
        require(amount > 0, "Distributor: amount has to be > 0");
        IWhitelistToken token = IWhitelistToken(_tokenAddress);
        _TotalIncomes.push(amount);
        emit IncomeAdded(amount, uint16(_TotalIncomes.length - 1));
        token.snapshot();
    }

    function cumulativeShareOf(address tokenHolder) external view returns (uint40) {
        Income storage holderIncome = _splitIncomes[tokenHolder];
        require(holderIncome.snapshotIdx == _TotalIncomes.length - 1, 'Distributor: Call computeCumulativeShare first to update share');
        return holderIncome.amount;
    }

    function cumulativeWithdrawalsOf(address tokenHolder) external view returns (uint40) {
        return _withdrawals[tokenHolder];
    }

    function _computeCumulativeShare(address tokenHolder) private {
        Income storage holderIncome = _splitIncomes[tokenHolder];
        if (holderIncome.present && holderIncome.snapshotIdx + 1 == _TotalIncomes.length) {
            // There are no new periods to compute
            return;
        }

        IWhitelistToken token = IWhitelistToken(_tokenAddress);
        uint40 additionalAmount;
        uint16 startAtSnapshotIdx = holderIncome.snapshotIdx;

        // Start at the first income, or the next one if share had already been computed at least once before for this tokenHolder.
        if (startAtSnapshotIdx > 0) {
            startAtSnapshotIdx += 1;
        }

        for(uint16 i=startAtSnapshotIdx; i < _TotalIncomes.length; i++) {
            additionalAmount += uint40(token.shareOfAt(tokenHolder, i + 1) * (_TotalIncomes[i] * 100) / 1000000);
        }

        holderIncome.present = true;
        holderIncome.snapshotIdx = uint16(_TotalIncomes.length) - 1;
        holderIncome.amount += additionalAmount;
    }

    function addIncome(uint40 amount) external onlyOwner{
        _addIncome(amount);
    }

    function computeCumulativeShare(address tokenHolder) external {
        _computeCumulativeShare(tokenHolder);
    }

    // Withdrawal
    function withdraw() external {
        _withdraw(msg.sender);
    }

    function _withdraw(address tokenHolder) internal {
        IWhitelistToken token = IWhitelistToken(_tokenAddress);
        require(token.hasRole(token.WHITELIST(), tokenHolder), 'Distributor: sender is restricted');
        _computeCumulativeShare(tokenHolder);

        uint40 balance = _splitIncomes[tokenHolder].amount - _withdrawals[tokenHolder];
        require(balance > 0, 'Distributor: No balance to withdraw');

        IERC20 coin = IERC20(_coinAddress);
        uint48 coinAmount = uint48(balance) * 10_000;
        require(coin.balanceOf(address(this)) >= coinAmount, "Distributor: Contract doesn't have sufficient fund");

        // Update lifetime amount withdrew
        _withdrawals[tokenHolder] += balance;
        emit Withdrawal(tokenHolder, balance);

        // Transfer coins to token holder
        coin.safeTransfer(tokenHolder, coinAmount);

    }

    // Transfer funds out of the contract to its owner
    function _transferToOwner(uint256 amount) internal {
        IERC20 coin = IERC20(_coinAddress);
        require(coin.balanceOf(address(this)) >= amount, "Distributor: Contract doesn't have sufficient fund");
        coin.safeTransfer(owner(), amount);
    }

    function transferToOwner(uint256 amount) external onlyOwner {
        _transferToOwner(amount);
    }


    // EVENTS

    /**
     * Emitted when `amount` income is added, with snapshot Index (`snapshotIdx`)
     */
    event IncomeAdded(uint40 amount, uint16 snapshotIdx);

    /**
     * Emitted when an `amount` balance is withdrew by (`tokenHolder`)
     */
    event Withdrawal(address tokenHolder, uint40 amount);

}
