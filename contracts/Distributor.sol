// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISnapshotToken} from "./ISnapshotToken.sol";

contract Distributor is AccessManaged {
    using SafeERC20 for IERC20;

    struct Income {
        bool   importedAmountFromPrevious;
        uint16 snapshotId;
        uint40 amount;
    }

    address public _tokenAddress;
    address public _coinAddress;
    uint40[] public _TotalIncomes;
    address private _previousAddress;
    mapping(address => Income) public _splitIncomes;

    constructor(address manager, address tokenAddress, address coinAddress, address previousAddress) AccessManaged(manager) {
        _tokenAddress = tokenAddress;
        _coinAddress = coinAddress; // Coin used for income payment
        _previousAddress = previousAddress; // Address of previous distributor instance
    }

    // Income and share computation
    function _addIncome(uint40 amount) internal {
        require(amount > 0, "Distributor: amount has to be > 0");
        ISnapshotToken token = ISnapshotToken(_tokenAddress);
        _TotalIncomes.push(amount);
        emit IncomeAdded(amount, uint16(_TotalIncomes.length));
        token.snapshot();
    }

    function cumulativeShareOf(address tokenHolder) external view returns (uint40) {
        Income storage holderIncome = _splitIncomes[tokenHolder];
        require(holderIncome.snapshotId == _TotalIncomes.length && holderIncome.importedAmountFromPrevious, 'Distributor: Call computeCumulativeShare first to update share');
        return holderIncome.amount;
    }

    function _computeCumulativeShare(address tokenHolder) private {
        Income storage holderIncome = _splitIncomes[tokenHolder];
        // Initialize data from previous distributor instance
        if (!holderIncome.importedAmountFromPrevious) {
            Distributor previousDistributor = Distributor(_previousAddress);
            previousDistributor.computeCumulativeShare(tokenHolder);
            holderIncome.amount = previousDistributor.cumulativeShareOf(tokenHolder);
            holderIncome.importedAmountFromPrevious = true;
        }


        if (holderIncome.snapshotId == _TotalIncomes.length) {
            // There are no new periods to compute
            return;
        }

        // Compute new periods income
        ISnapshotToken token = ISnapshotToken(_tokenAddress);
        uint40 additionalAmount;

        // Start at the next period
        uint16 startAtSnapshotId = holderIncome.snapshotId + 1;

        for(uint16 i=startAtSnapshotId; i < _TotalIncomes.length + 1; i++) {
            additionalAmount += uint40(token.shareOfAt(tokenHolder, i) * (_TotalIncomes[i-1] * 100) / 1000000);
        }

        // Store last computed period and add new amount to holder balance
        holderIncome.snapshotId = uint16(_TotalIncomes.length);
        holderIncome.amount += additionalAmount;
    }

    function addIncome(uint40 amount) external restricted {
        _addIncome(amount);
    }

    function computeCumulativeShare(address tokenHolder) external {
        _computeCumulativeShare(tokenHolder);
    }

    // Withdrawal
    function withdraw() external restricted {
        _withdraw(msg.sender);
    }

    function withdrawTo(address tokenHolder) external restricted {
        _withdraw(tokenHolder);
    }

    function _withdraw(address tokenHolder) internal {
        _computeCumulativeShare(tokenHolder);

        uint40 balance = _splitIncomes[tokenHolder].amount;
        require(balance > 0, 'Distributor: No balance to withdraw');

        IERC20 coin = IERC20(_coinAddress);
        uint48 coinAmount = uint48(balance) * 10_000;
        require(coin.balanceOf(address(this)) >= coinAmount, "Distributor: Contract doesn't have sufficient fund");

        // Reset balance
        _splitIncomes[tokenHolder].amount = 0;

        emit Withdrawal(tokenHolder, balance);

        // Transfer coins to token holder
        coin.safeTransfer(tokenHolder, coinAmount);
    }

    // Transfer funds out of the contract to its owner
    function _transferToOwner(uint256 amount) internal {
        IERC20 coin = IERC20(_coinAddress);
        require(coin.balanceOf(address(this)) >= amount, "Distributor: Contract doesn't have sufficient fund");
        coin.safeTransfer(msg.sender, amount);
    }

    function transferToOwner(uint256 amount) external restricted {
        _transferToOwner(amount);
    }

    // EVENTS

    /**
     * Emitted when `amount` income is added, with snapshot Id (`snapshotId`)
     */
    event IncomeAdded(uint40 amount, uint16 snapshotId);

    /**
     * Emitted when an `amount` balance is withdrew by (`tokenHolder`)
     */
    event Withdrawal(address tokenHolder, uint40 amount);

}
