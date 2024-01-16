// SPDX-License-Identifier: MIT
// From https://forum.openzeppelin.com/t/erc20snapshot-alternative-in-new-oz-library/38137/16

pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Checkpoints} from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";

abstract contract ERC20Snapshot is ERC20, IERC6372 {
    using Checkpoints for Checkpoints.Trace208;

    mapping(address account => Checkpoints.Trace208) private _balanceCheckpoints;
    Checkpoints.Trace208 private _totalSupplyCheckpoints;

    error ERC20SnapshotFutureLookup(uint256 snapshotId, uint256 currentsnapshotId);

    uint48 private _snapshotId;

    event ERC20SnapshotCheckpointed(uint48 id);

    function clock() public view virtual returns (uint48) {
        return _snapshotId;
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public view virtual returns (string memory) {
        return "mode=counter";
    }

    function _snapshot() internal virtual returns (uint256) {
        uint48 currentId = _snapshotId++;
        emit ERC20SnapshotCheckpointed(currentId);
        return currentId;
    }

    function totalSupplyAt(uint48 snapshotId) public view virtual returns (uint256) {
        uint48 currentSnapshotId = clock();
        if (snapshotId >= currentSnapshotId) {
            revert ERC20SnapshotFutureLookup(snapshotId, currentSnapshotId);
        }
        return _totalSupplyCheckpoints.upperLookupRecent(snapshotId);
    }

    function balanceOfAt(address account, uint48 snapshotId) public view virtual returns (uint256) {
        uint48 currentSnapshotId = clock();
        if (snapshotId >= currentSnapshotId) {
            revert ERC20SnapshotFutureLookup(snapshotId, currentSnapshotId);
        }
        return _balanceCheckpoints[account].upperLookupRecent(snapshotId);
    }

    function _update(address from, address to, uint256 value) internal override virtual {
        uint208 delta = SafeCast.toUint208(value);
        uint48 snapshotId = clock();

        if (from == address(0)) {
            // Increment to
            uint208 latestBalance = _balanceCheckpoints[to].latest();
            _balanceCheckpoints[to].push(snapshotId, latestBalance + delta);

            // Increment supply
            uint208 latestTotalSupply = _totalSupplyCheckpoints.latest();
            _totalSupplyCheckpoints.push(snapshotId, latestTotalSupply + delta);
        } else if (to == address(0)) {
            // Reduce from
            uint208 latestBalance = _balanceCheckpoints[from].latest();
            _balanceCheckpoints[from].push(snapshotId, latestBalance - delta);

            // Reduce supply
            uint208 latestTotalSupply = _totalSupplyCheckpoints.latest();
            _totalSupplyCheckpoints.push(snapshotId, latestTotalSupply - delta);
        } else {
            // Reduce from
            uint208 latestFromBalance = _balanceCheckpoints[from].latest();
            _balanceCheckpoints[from].push(snapshotId, latestFromBalance - delta);

            // Increment to
            uint208 latestToBalance = _balanceCheckpoints[to].latest();
            _balanceCheckpoints[to].push(snapshotId, latestToBalance + delta);
        }

        super._update(from, to, value);
    }
}