// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockDistributor {
    mapping(address => uint40) public _splitIncomes;
    mapping(address => bool) public _incomeComputed;

    function _withdraw(address tokenHolder) internal {
        if (_splitIncomes[tokenHolder] > 0) {
            emit Withdrawal();
        }
    }

    function withdraw() external {
        _withdraw(msg.sender);
    }

    function withdrawTo(address tokenHolder) external {
        _withdraw(tokenHolder);
    }

    function computeCumulativeShare(address tokenHolder) external {
        _incomeComputed[tokenHolder] = true;
    }


    function cumulativeShareOf(address tokenHolder) external view returns (uint40) {
        require( _incomeComputed[tokenHolder], 'MockDistributor: Call computeCumulativeShare first to update share');
        return _splitIncomes[tokenHolder];
    }

    function setIncome(address tokenHolder, uint40 amount) external {
        _splitIncomes[tokenHolder] = amount;
    }

    event Withdrawal();
}
