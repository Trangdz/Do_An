// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IERC677Receiver {
    function onTokenTransfer(address from, uint256 amount, bytes calldata data) external returns (bool success);
}

// Minimal ERC677-compatible LINK token for local development
contract LinkToken is ERC20 {
    constructor() ERC20("Chainlink", "LINK") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function transferAndCall(address to, uint256 amount, bytes calldata data) external returns (bool success) {
        _transfer(msg.sender, to, amount);
        if (_isContract(to)) {
            // swallow return to avoid reverts due to non-standard implementations
            try IERC677Receiver(to).onTokenTransfer(msg.sender, amount, data) returns (bool ok) {
                success = ok;
            } catch {
                success = true;
            }
        } else {
            success = true;
        }
    }

    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}


