// SPDX-License-Identifier: MIT
interface IDistributor {
  function addIncome ( uint40 amount ) external;
  function computeCumulativeShare ( address tokenHolder ) external;
  function cumulativeShareOf ( address tokenHolder ) external view returns ( uint40 );
  function owner (  ) external view returns ( address );
  function renounceOwnership (  ) external;
  function transferOwnership ( address newOwner ) external;
  function transferToOwner ( uint256 amount ) external;
  function withdraw (  ) external;
  function withdrawTo(address tokenHolder) external;
}
