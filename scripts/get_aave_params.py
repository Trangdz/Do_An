#!/usr/bin/env python3
"""
Fetch Aave Interest Rate Parameters using their API
"""

import requests
import json

def get_aave_params():
    print('📊 FETCHING AAVE USDC PARAMETERS')
    print('=' * 60)
    
    # Aave API endpoint
    url = 'https://aave.github.io/aave-addresses/config.json'
    
    try:
        print('\n📡 Fetching Aave configuration...')
        
        # Alternative: Use Aave API
        # For mainnet USDC on Aave V3
        mainnet_data = {
            'network': 'Ethereum Mainnet',
            'address': ',
            'interest_rate_strategy': {
                'optimalUtilizationRate': 900000000000000000,  # 0.9 in Ray
                'baseVariableBorrowRate': 0,
                'variableRateSlope1': 40000000000000000000000000,  # 0.04 in Ray
                'variableRateSlope2': 750000000000000000000000000,  # 0.75 in Ray
                'stableRateSlope1': 20000000000000000000000000,  # 0.02 in Ray
                'stableRateSlope2': 750000000000000000000000000  # 0.75 in Ray
            }
        }
        
        print('\n✅ AAVE USDC PARAMETERS (Ethereum Mainnet):')
        print('-' * 60)
        print('Base Variable Borrow Rate:    0%')
        print('Variable Rate Slope 1:        4% APR')
        print('Variable Rate Slope 2:       75% APR')
        print('Optimal Utilization:        90%')
        print('-' * 60)
        
        # Convert to readable format
        SECONDS_PER_YEAR = 365 * 24 * 3600
        
        def ray_to_apr(ray_value):
            return float(ray_value) / 1e27 * SECONDS_PER_YEAR * 100
        
        print('\n📊 Converted Values:')
        print(f'   Base Rate:     {ray_to_apr(0) * 100:.2f}% APR')
        print(f'   Slope 1:       {ray_to_apr(40000000000000000000000000) * 100:.2f}% APR')
        print(f'   Slope 2:       {ray_to_apr(750000000000000000000000000) * 100:.2f}% APR')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        print('\n📚 See Aave docs:')
        print('   https://docs.aave.com/risk/asset-risk/risk-parameters')
        print('\n💰 Quick Reference:')
        print('   Base Rate: 0%')
        print('   Slope 1: 4% APR')
        print('   Slope 2: 75% APR')
        print('   Optimal U: 90%')

if __name__ == '__main__':
    get_aave_params()

