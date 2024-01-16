// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IDistributor.sol";

contract DistributorAggregator {
    // Withdrawal
    function withdraw(address[] calldata distributorList) external {
        IDistributor distributor;
        uint40 share;
        for(uint16 i=0; i < distributorList.length; i++) {
            distributor = IDistributor(distributorList[i]);
            distributor.computeCumulativeShare(msg.sender);
            share = distributor.cumulativeShareOf(msg.sender);
            if (share > 0) {
                distributor.withdrawTo(msg.sender);
            }
        }
    }
}
