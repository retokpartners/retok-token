// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

contract MockDistributor {
    mapping (address => uint40) shares;
    mapping (address => bool) computed;

    function withdraw() external {
        if (shares[msg.sender] > 0 && computed[msg.sender]) {
            emit Withdrawal();
        }
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
