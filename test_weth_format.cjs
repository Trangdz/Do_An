// Test formatWETHBalance function
function formatBalance(value, decimals = 4) {
  if (value === 0) return '0';
  if (value < 0.0001) return '< 0.0001';
  
  // For very large numbers, show more precision
  if (value >= 1000000) {
    const millions = value / 1000000;
    if (millions >= 100) {
      return `${millions.toFixed(0)}M`;
    } else if (millions >= 10) {
      return `${millions.toFixed(1)}M`;
    } else {
      // Show 4 decimal places for numbers < 10M to see the difference
      return `${millions.toFixed(4)}M`;
    }
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  
  return value.toFixed(decimals);
}

function formatWETHBalance(value, decimals = 4) {
  // WETH contract has 1M initial supply, so subtract it to show actual user balance
  const actualBalance = Math.max(0, value - 1000000);
  return formatBalance(actualBalance, decimals);
}

// Test cases
console.log("Testing formatWETHBalance function:");
console.log("1,000,036 →", formatWETHBalance(1000036));
console.log("1,000,061 →", formatWETHBalance(1000061));
console.log("1,000,000 →", formatWETHBalance(1000000));
console.log("1,000,100 →", formatWETHBalance(1000100));
console.log("1,001,000 →", formatWETHBalance(1001000));
console.log("1,010,000 →", formatWETHBalance(1010000));
console.log("1,100,000 →", formatWETHBalance(1100000));
console.log("10,000,000 →", formatWETHBalance(10000000));

