// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

contract MockDistributor {
    function withdraw() external {
        emit Withdrawal();
    }

    event Withdrawal();
}
