// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "./IDistributor.sol";

contract DistributorAggregator {
    // Withdrawal
    function withdraw(address[] calldata distributorList) external {
        for(uint16 i=0; i < distributorList.length; i++) {
            IDistributor distributor = IDistributor(distributorList[i]);
            distributor.withdraw();
        }
    }
}