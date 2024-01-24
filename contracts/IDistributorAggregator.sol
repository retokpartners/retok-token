// SPDX-License-Identifier: MIT
pragma solidity >=0.1.0 <0.9.0;

interface IDistributorAggregator {
  function withdraw ( address[] memory distributorList ) external;
}
