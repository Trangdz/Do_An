const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking balances for:", deployer.address);
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    console.log("ETH Balance:", ethers.formatEther(ethBalance), "ETH");
    
    // Check WETH balance
    const wethAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const wethContract = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)"
    ], ethers.provider);
    
    const wethBalance = await wethContract.balanceOf(deployer.address);
    console.log("WETH Balance:", ethers.formatEther(wethBalance), "WETH");
    
    const totalSupply = await wethContract.totalSupply();
    console.log("WETH Total Supply:", ethers.formatEther(totalSupply), "WETH");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
