// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenWithWithdraw is ERC20 {
    uint8 private _decimals;
    address public owner;
    
    event Withdraw(address indexed user, uint256 amount);
    event Deposit(address indexed user, uint256 amount);
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        owner = msg.sender;
        _mint(msg.sender, initialSupply * 10**decimals_);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    // Mint function for testing
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner can mint");
        _mint(to, amount);
    }
    
    // Withdraw function - burn tokens and send ETH
    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(totalSupply() >= amount, "Insufficient total supply");
        
        _burn(msg.sender, amount);
        
        // Send ETH equivalent (1 token = 1 wei for simplicity)
        uint256 ethAmount = amount;
        require(address(this).balance >= ethAmount, "Insufficient ETH in contract");
        
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        emit Withdraw(msg.sender, amount);
    }
    
    // Deposit function - send ETH to get tokens
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        
        // Mint tokens equal to ETH sent (1 ETH = 1 token)
        _mint(msg.sender, msg.value);
        
        emit Deposit(msg.sender, msg.value);
    }
    
    // Function to receive ETH
    receive() external payable {
        // Auto-mint tokens when ETH is sent
        if (msg.value > 0) {
            _mint(msg.sender, msg.value);
            emit Deposit(msg.sender, msg.value);
        }
    }
    
    // Function to add ETH to contract for withdrawals
    function addLiquidity() external payable {
        require(msg.value > 0, "Must send ETH");
        // ETH is now available for withdrawals
    }
}
