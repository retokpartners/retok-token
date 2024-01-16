// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import "./ERC20Snapshot.sol";

contract SnapshotToken is IERC20, AccessManaged, ERC20Snapshot {
    // Event codes
    uint8 private constant SALE = 0;
    uint8 private constant REPLACE = 1;
    uint8 private constant OTHER = 2;

    constructor(string memory _name, string memory _symbol, address manager) ERC20(_name,_symbol) AccessManaged(manager) {
    }

    /**
     * Concatenate Strings with an optimized Method.
     *
     * Requirements
     *
     * - `a` a String
     * - `b` a String
     */
    function cat(string memory a, string memory b) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b));
    }



    /**
     * Destroys `amount` tokens from `account`.
     *
     * See {_burn}.
     */
    function burn(address account, uint256 amount, uint8 code) external restricted {
        require(code == REPLACE || code == OTHER, cat(name(), ": The code does not exist"));
        _burn(account, amount);
        emit Burn(account, amount, code);
    }

    /**
     * Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Mint} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function mintTo(address account, uint256 amount, uint8 code) external restricted {
        require(code == SALE || code == REPLACE, cat(name(), ": The code does not exist"));
        _mint(account, amount);
        emit Mint(account, amount, code);
    }

    /**
     * Triggers a snapshot
     */
    function snapshot() external restricted returns (uint16)  {
        return uint16(_snapshot());
    }

    /**
     * Return the share of a tokenHolder at a given snapshot, in millionth
     */
    function shareOfAt(address tokenHolder, uint16 snapshotId) external view returns (uint256) {
        uint256 precision = 1_000_000;
        return (balanceOfAt(tokenHolder, snapshotId) * precision) / totalSupplyAt(snapshotId);
    }

    /**
     * Returns a human-readable message for a given burncode
     */
    function messageForBurnCode(uint8 code) external pure returns (string memory){
        if (code == REPLACE) {
            return "Replace tokens";
        } else if (code == OTHER) {
            return "Other";
        } else {
            return "Unknown code";
        }
    }

    /**
     * Returns a human-readable message for a given mintcode
     */
    function messageForMintCode(uint8 code) external pure returns (string memory){
        if (code == SALE) {
            return "New tokens sold";
        } else if (code == REPLACE) {
            return "Replacement tokens";
        } else {
            return "Unknown code";
        }
    }

    /**
     * Emitted when `value` tokens are burned from an account (`from`)
     */
    event Burn(address indexed from, uint256 value, uint8 code);

    /**
     * Emitted when `value` tokens are minted to an account (`to`)
     */
    event Mint(address indexed to, uint256 value, uint8 code);
}
