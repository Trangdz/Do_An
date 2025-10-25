export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get('user');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = parseInt(searchParams.get('offset')) || 0;

  // Return demo data for testing
  const demoTransactions = [
    {
      id: 'demo-1',
      hash: '0xaa1ada5b30c79b59fcd7fa56e2fd7ae337b1098f69c7665c8ff49dac7ec62b40',
      type: 'Lend',
      user: user || '0xc7c744636f70D3ee88141e8a2a44F8225DeE6c76',
      asset: '0x853ce536DBbFF984dA79E69BD74248bF4ae4e266',
      assetSymbol: 'WETH',
      amount: '1.5',
      amountUSD: '3750.00',
      timestamp: Math.floor(Date.now() / 1000) - 3600,
      blockNumber: 12345678,
      status: 'success',
      gasUsed: '28',
      gasPrice: '20000000000',
      txFee: '0.00000056',
      txFeeUSD: '0.001'
    },
    {
      id: 'demo-2',
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      type: 'Borrow',
      user: user || '0xc7c744636f70D3ee88141e8a2a44F8225DeE6c76',
      asset: '0x594ac7771932F98E79Df7feA69b9F2261b060863',
      assetSymbol: 'DAI',
      amount: '1000.00',
      amountUSD: '1000.00',
      timestamp: Math.floor(Date.now() / 1000) - 7200,
      blockNumber: 12345679,
      status: 'success',
      gasUsed: '45000',
      gasPrice: '20000000000',
      txFee: '0.0009',
      txFeeUSD: '1.80'
    }
  ];

  // Filter by type if specified
  const filteredTransactions = type && type !== 'All' 
    ? demoTransactions.filter(tx => tx.type === type)
    : demoTransactions;

  // Apply pagination
  const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

  return Response.json({
    success: true,
    data: {
      transactions: paginatedTransactions,
      pagination: {
        total: filteredTransactions.length,
        limit,
        offset,
        hasMore: offset + limit < filteredTransactions.length
      }
    }
  });
}




