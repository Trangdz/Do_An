const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking balances for:", deployer.address);
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    console.log("ETH Balance:", ethers.utils.formatEther(ethBalance), "ETH");
    
    // Check WETH balance
    const wethAddress = "0x2504893eba0fE90Eb18E043147648b844d4b822d";
    const wethContract = new ethers.Contract(wethAddress, [
        "function balanceOf(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)"
    ], ethers.provider);
    
    const wethBalance = await wethContract.balanceOf(deployer.address);
    console.log("WETH Balance:", ethers.utils.formatEther(wethBalance), "WETH");
    
    const totalSupply = await wethContract.totalSupply();
    console.log("WETH Total Supply:", ethers.utils.formatEther(totalSupply), "WETH");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
