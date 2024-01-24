// SPDX-License-Identifier: MIT
pragma solidity >=0.1.0 <0.9.0;

interface ISnapshotToken {
  function CLOCK_MODE (  ) external view returns ( string memory );
  function allowance ( address owner, address spender ) external view returns ( uint256 );
  function approve ( address spender, uint256 value ) external returns ( bool );
  function authority (  ) external view returns ( address );
  function balanceOf ( address account ) external view returns ( uint256 );
  function balanceOfAt ( address account, uint48 snapshotId ) external view returns ( uint256 );
  function burn ( address account, uint256 amount, uint8 code ) external;
  function clock (  ) external view returns ( uint48 );
  function decimals (  ) external pure returns ( uint8 );
  function isConsumingScheduledOp (  ) external view returns ( bytes4 );
  function messageForBurnCode ( uint8 code ) external pure returns ( string memory );
  function messageForMintCode ( uint8 code ) external pure returns ( string memory );
  function mintTo ( address account, uint256 amount, uint8 code ) external;
  function name (  ) external view returns ( string memory );
  function setAuthority ( address newAuthority ) external;
  function shareOfAt ( address tokenHolder, uint16 snapshotId ) external view returns ( uint256 );
  function snapshot (  ) external returns ( uint16 );
  function symbol (  ) external view returns ( string memory );
  function totalSupply (  ) external view returns ( uint256 );
  function totalSupplyAt ( uint48 snapshotId ) external view returns ( uint256 );
  function transfer ( address to, uint256 value ) external returns ( bool );
  function transferFrom ( address from, address to, uint256 value ) external returns ( bool );
}
