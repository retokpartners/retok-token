// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "./IERC1404.sol";

contract WhitelistToken is IERC20, IERC1404, Ownable, AccessControl, ERC20Snapshot {
    bytes32 public constant WHITELIST = keccak256("WHITELIST");
    bytes32 public constant SNAPSHOT = keccak256("SNAPSHOT");

    // Restriction codes
    uint8 private constant NO_RESTRICTIONS = 0;
    uint8 private constant FROM_NOT_WHITELISTED = 1;
    uint8 private constant TO_NOT_WHITELISTED = 2;

    // Event codes
    uint8 private constant SALE = 0;
    uint8 private constant REPLACE = 1;
    uint8 private constant OTHER = 2;

    constructor(string memory _name, string memory _symbol) ERC20(_name,_symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, Ownable.owner());
    }

    /**
     * Returns the number of decimals the token uses
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * Moves tokens `amount` from `sender` to `recipient`.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(address sender, address recipient, uint256 amount) override internal {
        require(detectTransferRestriction(sender,recipient,amount) == NO_RESTRICTIONS, cat(name(), ": Transfer restriction detected. Please call detectTransferRestriction(address from, address to, uint256 value) for detailed information"));
        return super._transfer(sender, recipient, amount);
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
     * Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal override {
        require(hasRole(WHITELIST, account), cat(name(), ": address is not in whitelist"));
        return super._mint(account, amount);
    }


    /**
     * Destroys `amount` tokens from `account`.
     *
     * See {_burn}.
     */
    function burn(address account, uint256 amount, uint8 code) external onlyOwner {
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
    function mintTo(address account, uint256 amount, uint8 code) external onlyOwner {
        require(code == SALE || code == REPLACE, cat(name(), ": The code does not exist"));
        _mint(account, amount);
        emit Mint(account, amount, code);
    }

    /**
     * Triggers a snapshot
     */
    function snapshot() external returns (uint16) {
        require(hasRole(SNAPSHOT, msg.sender), cat(name(), ": sender is not allowed to take snapshots"));
        return uint16(_snapshot());
    }

    /**
     * Return the share of a tokenHolder at a given snapshot, in millionth
     */
    function shareOfAt(address tokenHolder, uint16 snapshotId) external view returns (uint256) {
        require(snapshotId > 0, cat(name(), ": snapshotId must be > 0"));
        uint256 precision = 1_000_000;
        return (balanceOfAt(tokenHolder, snapshotId) * precision) / totalSupplyAt(snapshotId);
    }

    /**
     * Returns a human-readable message for a given restrictioncode
     */
    function messageForTransferRestriction(uint8 code) external pure returns (string memory){
        if (code == TO_NOT_WHITELISTED) {
            return "Recipient not in whitelist";
        } else if (code == FROM_NOT_WHITELISTED) {
            return "Sender not in whitelist";
        } else {
            return "Unknown code";
        }
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
     * Detects if a transfer will be reverted and if so returns an appropriate reference code
     */
    function detectTransferRestriction(address from, address to, uint256 value) public view returns (uint8){
        if(!hasRole(WHITELIST, from)){
            return FROM_NOT_WHITELISTED;
        } else if(!hasRole(WHITELIST, to)){
            return TO_NOT_WHITELISTED;
        } else {
            return NO_RESTRICTIONS;
        }
    }

    /**
     * Add a list of addresses to the whitelist
     */
    function addUserListToWhitelist(address[] calldata whitelistedAddresses) external onlyOwner {
        for(uint i=0; i< whitelistedAddresses.length; i++){
            grantRole(WHITELIST, whitelistedAddresses[i]);
        }
    }

    /**
     * Remove a list of address from the whitelist
     */
    function removeUserFromWhitelist(address[] calldata whitelistedAddresses) external onlyOwner {
        for(uint i=0; i< whitelistedAddresses.length; i++){
            revokeRole(WHITELIST, whitelistedAddresses[i]);
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
