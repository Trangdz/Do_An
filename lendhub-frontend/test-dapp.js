// Test script to verify dApp functionality
// Run this in browser console after opening http://localhost:3000

console.log('🧪 Starting LendHub v2 dApp Test Suite...');

// Test 1: Check if dApp loads correctly
function testAppLoad() {
  console.log('📋 Test 1: App Load');
  
  // Check if main elements exist
  const walletButton = document.querySelector('[data-testid="wallet-button"]') || 
                      document.querySelector('button:contains("Connect Wallet")');
  const poolOverview = document.querySelector('h2:contains("Pool Overview")') ||
                      document.querySelector('[data-testid="pool-overview"]');
  
  if (walletButton) {
    console.log('✅ Wallet button found');
  } else {
    console.log('❌ Wallet button not found');
  }
  
  if (poolOverview) {
    console.log('✅ Pool overview found');
  } else {
    console.log('❌ Pool overview not found');
  }
}

// Test 2: Check if modals can be opened
function testModals() {
  console.log('📋 Test 2: Modal Functionality');
  
  // Try to find and click supply button
  const supplyButtons = document.querySelectorAll('button:contains("Supply")');
  if (supplyButtons.length > 0) {
    console.log('✅ Supply buttons found:', supplyButtons.length);
    
    // Click first supply button
    supplyButtons[0].click();
    
    // Check if modal opens
    setTimeout(() => {
      const modal = document.querySelector('[role="dialog"]') || 
                   document.querySelector('.fixed.inset-0');
      if (modal) {
        console.log('✅ Modal opened successfully');
        
        // Close modal
        const closeButton = modal.querySelector('button:contains("Cancel")') ||
                           modal.querySelector('button[aria-label="Close"]');
        if (closeButton) {
          closeButton.click();
          console.log('✅ Modal closed successfully');
        }
      } else {
        console.log('❌ Modal did not open');
      }
    }, 1000);
  } else {
    console.log('❌ Supply buttons not found');
  }
}

// Test 3: Check data loading
function testDataLoading() {
  console.log('📋 Test 3: Data Loading');
  
  // Check if ETH balance is displayed
  const ethBalance = document.querySelector('text:contains("ETH")') ||
                    document.querySelector('[data-testid="eth-balance"]');
  
  if (ethBalance) {
    console.log('✅ ETH balance element found');
  } else {
    console.log('❌ ETH balance element not found');
  }
  
  // Check if token cards are displayed
  const tokenCards = document.querySelectorAll('[data-testid="token-card"]') ||
                    document.querySelectorAll('.bg-white.rounded-lg.shadow');
  
  if (tokenCards.length > 0) {
    console.log('✅ Token cards found:', tokenCards.length);
  } else {
    console.log('❌ Token cards not found');
  }
}

// Test 4: Check console for errors
function testConsoleErrors() {
  console.log('📋 Test 4: Console Errors');
  
  // Override console.error to catch errors
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  // Wait a bit for any async errors
  setTimeout(() => {
    if (errors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log('❌ Console errors detected:', errors);
    }
    
    // Restore original console.error
    console.error = originalError;
  }, 2000);
}

// Test 5: Check responsive design
function testResponsiveDesign() {
  console.log('📋 Test 5: Responsive Design');
  
  // Check if viewport meta tag exists
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    console.log('✅ Viewport meta tag found');
  } else {
    console.log('❌ Viewport meta tag not found');
  }
  
  // Check if CSS is loaded
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  if (stylesheets.length > 0) {
    console.log('✅ Stylesheets loaded:', stylesheets.length);
  } else {
    console.log('❌ No stylesheets found');
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running LendHub v2 dApp Test Suite...\n');
  
  testAppLoad();
  setTimeout(() => testModals(), 1000);
  setTimeout(() => testDataLoading(), 2000);
  setTimeout(() => testConsoleErrors(), 3000);
  setTimeout(() => testResponsiveDesign(), 4000);
  
  setTimeout(() => {
    console.log('\n✅ Test suite completed!');
    console.log('📊 Check results above for any issues.');
  }, 5000);
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.LendHubTests = {
  testAppLoad,
  testModals,
  testDataLoading,
  testConsoleErrors,
  testResponsiveDesign,
  runAllTests
};

console.log('💡 Manual testing available via window.LendHubTests');
