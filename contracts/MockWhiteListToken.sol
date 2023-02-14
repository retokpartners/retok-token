// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

contract MockWhitelistToken {
    bytes32 public constant WHITELIST = keccak256("WHITELIST");
    mapping(address => uint256) public balances;
    mapping(address => mapping(uint40 => uint256)) public shares;
    mapping(address => bool) public whitelist;


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

    function hasRole(bytes32 role, address tokenHolder) external view returns (bool) {
        require(role == WHITELIST, 'MockWhitelistToken: Wrong role specified for hasRole');
        return whitelist[tokenHolder];
    }



    function addUserListToWhitelist(address[] calldata whitelistedAddresses) external {
        for(uint i=0; i< whitelistedAddresses.length; i++){
            whitelist[whitelistedAddresses[i]] = true;
        }
    }

    function removeUserFromWhitelist(address[] calldata whitelistedAddresses) external {
        for(uint i=0; i< whitelistedAddresses.length; i++){
            whitelist[whitelistedAddresses[i]] = false;
        }
    }

    event Snapshot();
}
