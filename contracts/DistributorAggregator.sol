// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import "./IDistributor.sol";

// Proxy contract to withdraw from multiple distributors in one transaction
contract DistributorAggregator is AccessManaged {

    constructor(address manager) AccessManaged(manager) {
    }

    // Withdrawal
    function withdraw(address[] calldata distributorList) external restricted {
        IDistributor distributor;
        uint40 balance;

        for(uint16 i=0; i < distributorList.length; i++) {
            distributor = IDistributor(distributorList[i]);
            distributor.computeCumulativeShare(msg.sender);
            balance = distributor.cumulativeShareOf(msg.sender);

            // Only call withdraw if there's actually a balance to withdraw
            if (balance > 0) {
                distributor.withdrawTo(msg.sender);
            }
        }
    }
}
