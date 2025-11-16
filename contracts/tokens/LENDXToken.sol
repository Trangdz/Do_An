// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LENDXToken
 * @notice Governance token for LendHub protocol
 * @dev Total supply: 100,000,000 LENDX (100M)
 * - Supports voting power for governance (ERC20Votes)
 * - Supports permit functionality (ERC20Permit)
 * - Initial distribution:
 *   - Team: 15M (locked in vesting)
 *   - User Rewards: 40M (in RewardDistributor)
 *   - DAO Treasury: 25M
 *   - Marketing/Investors: 20M
 */
contract LENDXToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 1e18; // 100M tokens

    constructor(address initialOwner) 
        ERC20("LendHub Governance Token", "LENDX") 
        ERC20Permit("LendHub Governance Token") 
        Ownable(initialOwner) 
    {
        // Mint all tokens to deployer
        // Deployer will distribute to different contracts
        _mint(initialOwner, TOTAL_SUPPLY);
    }

    /**
     * @notice Mint additional tokens (only owner, for emergency)
     * @dev Should be disabled after initial distribution
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // The following functions are overrides required by Solidity.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    // Override nonces to resolve conflict between ERC20Permit and Votes (which uses Nonces)
    function nonces(address owner) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}








































