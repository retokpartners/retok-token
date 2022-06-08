// SPDX-License-Identifier: MIT
// Dummy mintable ERC20 coin for testing purposes.
pragma solidity 0.8.12;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PaymentCoin is IERC20, ERC20 {

  constructor(string memory _name, string memory _symbol) ERC20(_name,_symbol) {
  }

  function mintTo(address to, uint256 amount) public {
    super._mint(to, amount);
  }
}