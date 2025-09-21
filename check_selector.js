const crypto = require('crypto');

// Function selector for deposit()
const functionName = 'deposit()';
const hash = crypto.createHash('sha3-256').update(functionName).digest('hex');
const selector = '0x' + hash.slice(0, 8);

console.log('Function:', functionName);
console.log('Selector:', selector);

// Check if it matches the one in frontend
const frontendSelector = '0xd0e30db0';
console.log('Frontend selector:', frontendSelector);
console.log('Match:', selector === frontendSelector);

