// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

interface IWhitelistToken {
  function DEFAULT_ADMIN_ROLE (  ) external view returns ( bytes32 );
  function SNAPSHOT (  ) external view returns ( bytes32 );
  function WHITELIST (  ) external view returns ( bytes32 );
  function addUserListToWhitelist ( address[] calldata whitelistedAddresses ) external;
  function allowance ( address owner, address spender ) external view returns ( uint256 );
  function approve ( address spender, uint256 amount ) external returns ( bool );
  function balanceOf ( address account ) external view returns ( uint256 );
  function balanceOfAt ( address account, uint256 snapshotId ) external view returns ( uint256 );
  function burn ( address account, uint256 amount, uint8 code ) external;
  function decimals (  ) external pure returns ( uint8 );
  function decreaseAllowance ( address spender, uint256 subtractedValue ) external returns ( bool );
  function detectTransferRestriction ( address from, address to, uint256 value ) external view returns ( uint8 );
  function getRoleAdmin ( bytes32 role ) external view returns ( bytes32 );
  function grantRole ( bytes32 role, address account ) external;
  function hasRole ( bytes32 role, address account ) external view returns ( bool );
  function increaseAllowance ( address spender, uint256 addedValue ) external returns ( bool );
  function messageForBurnCode ( uint8 code ) external pure returns ( string memory );
  function messageForMintCode ( uint8 code ) external pure returns ( string memory );
  function messageForTransferRestriction ( uint8 code ) external pure returns ( string memory );
  function mintTo ( address account, uint256 amount, uint8 code ) external;
  function name (  ) external view returns ( string memory );
  function owner (  ) external view returns ( address );
  function removeUserFromWhitelist ( address[] calldata whitelistedAddresses ) external;
  function renounceOwnership (  ) external;
  function renounceRole ( bytes32 role, address account ) external;
  function revokeRole ( bytes32 role, address account ) external;
  function snapshot (  ) external returns ( uint16 );
  function supportsInterface ( bytes4 interfaceId ) external view returns ( bool );
  function symbol (  ) external view returns ( string memory );
  function totalSupply (  ) external view returns ( uint256 );
  function totalSupplyAt ( uint256 snapshotId ) external view returns ( uint256 );
  function shareOfAt(address tokenHolder, uint16 snapshotId) external view returns (uint256);
  function transfer ( address to, uint256 amount ) external returns ( bool );
  function transferFrom ( address from, address to, uint256 amount ) external returns ( bool );
  function transferOwnership ( address newOwner ) external;
}
