// SPDX-License-Identifier: MIT
pragma solidity >=0.1.0 <0.9.0;

interface IDistributor {
  function _TotalIncomes ( uint256 ) external view returns ( uint40 );
  function _coinAddress (  ) external view returns ( address );
  function _splitIncomes ( address ) external view returns ( bool importedAmountFromPrevious, uint16 snapshotId, uint40 amount );
  function _tokenAddress (  ) external view returns ( address );
  function addIncome ( uint40 amount ) external;
  function authority (  ) external view returns ( address );
  function computeCumulativeShare ( address tokenHolder ) external;
  function cumulativeShareOf ( address tokenHolder ) external view returns ( uint40 );
  function isConsumingScheduledOp (  ) external view returns ( bytes4 );
  function setAuthority ( address newAuthority ) external;
  function transferToOwner ( uint256 amount ) external;
  function withdraw (  ) external;
  function withdrawTo ( address tokenHolder ) external;
}
