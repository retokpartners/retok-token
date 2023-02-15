// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

contract MockDistributor {
    mapping (address => uint40) shares;
    mapping (address => bool) computed;

    function _withdraw(address tokenHolder) internal {
        if (shares[tokenHolder] > 0 && computed[tokenHolder]) {
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
        computed[tokenHolder] = true;
    }

    function cumulativeShareOf(address tokenHolder) external view returns (uint40) {
        require(computed[tokenHolder], 'MockDistributor: Call computeCumulativeShare first to update share');
        return shares[tokenHolder];

    }

    function setShare(address tokenHolder, uint40 share) external {
        shares[tokenHolder] = share;
    }

    event Withdrawal();
}
