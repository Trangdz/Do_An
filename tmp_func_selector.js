const { ethers } = require('ethers');

const funcs = [
  'calculateHealthFactor(address user)',
  'getCurrentSupplyBalance(address user, address asset)',
  'getCurrentDebtBalance(address user, address asset)',
  'getAccountData(address user)',
  'setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
  'setReserveBorrowable(address asset, bool isBorrowable)',
  'setReserveBorrowable(address,bool)',
  'setUserUseReserveAsCollateral(address,bool)'
];

for (const sig of funcs) {
  console.log(sig, '=>', ethers.id(sig).slice(0, 10));
}

