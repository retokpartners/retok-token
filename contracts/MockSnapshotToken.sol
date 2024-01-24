// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockSnapshotToken {
    mapping(address => uint256) public balances;
    mapping(address => mapping(uint16 => uint256)) public shares;

    function burn(address account, uint256 amount, uint8 code) external  {
        balances[account] -= amount;
    }

    function mintTo(address account, uint256 amount, uint8 code) external{
        balances[account] += amount;
    }

    function snapshot() external returns (uint16) {
        emit Snapshot();
    }

    function shareOfAt(address tokenHolder, uint16 snapshotId) external view returns (uint256) {
        return shares[tokenHolder][snapshotId];
    }

    function setShareOfAt(address tokenHolder, uint16 snapshotId, uint256 share) external {
        shares[tokenHolder][snapshotId] = share;
    }

    event Snapshot();
}
