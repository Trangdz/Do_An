const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           🔑 GANACHE DEPLOYER ACCOUNT - IMPORT VÀO METAMASK       ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                    ║');
  console.log(`║ 📍 Address:      ${deployer.address}     ║`);
  console.log('║                                                                    ║');
  
  // Get private key if available
  if (deployer.privateKey) {
    console.log(`║ 🔐 Private Key:  ${deployer.privateKey}║`);
  } else {
    console.log('║ 🔐 Private Key:  (Check Ganache console window)                   ║');
  }
  
  console.log('║                                                                    ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log('║                        TOKEN BALANCES                              ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  
  // Check balances
  const ethBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`║ ETH:  ${hre.ethers.formatEther(ethBalance).padEnd(56)} ║`);
  
  // Token addresses
  const tokens = {
    WETH: "0x7C641c35fE63D2feb530Db477262351D752FAd76",
    DAI: "0xA08b4084B0dD0F91516637D47951CcE653f2EE5E",
    USDC: "0xBbB7f7030F70A69DB872458cFd979f5A919f4de1",
    LINK: "0xe640a9d2C4F972FeCd2ECA2a5a5A529778CfdaAB"
  };
  
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  
  for (const [symbol, address] of Object.entries(tokens)) {
    try {
      const contract = new hre.ethers.Contract(address, ERC20_ABI, hre.ethers.provider);
      const balance = await contract.balanceOf(deployer.address);
      const decimals = await contract.decimals();
      const formatted = hre.ethers.formatUnits(balance, decimals);
      console.log(`║ ${symbol}: ${formatted.padEnd(55)} ║`);
    } catch (e) {
      console.log(`║ ${symbol}: ERROR                                                       ║`);
    }
  }
  
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('\n📝 HƯỚNG DẪN IMPORT VÀO METAMASK:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1. Mở cửa sổ PowerShell đang chạy Ganache');
  console.log('2. Tìm "Private Keys" section trong output của Ganache');
  console.log('3. Copy private key của Account (0)');
  console.log('4. MetaMask → Import Account → Private Key → Paste');
  console.log('5. Chuyển network sang "Ganache Local" (port 7545, ChainID 1337)');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);








