// Test formatBalance function
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

// Test cases
console.log("Testing formatBalance function:");
console.log("1,000,049 →", formatBalance(1000049));
console.log("1,000,061 →", formatBalance(1000061));
console.log("1,000,000 →", formatBalance(1000000));
console.log("1,000,100 →", formatBalance(1000100));
console.log("1,001,000 →", formatBalance(1001000));
console.log("1,010,000 →", formatBalance(1010000));
console.log("1,100,000 →", formatBalance(1100000));
console.log("10,000,000 →", formatBalance(10000000));
