/**
 * Test page for interest calculation
 * Access at /test-interest
 */

import { AppLayout } from '@/components/layout/AppLayout';
import { InterestCalculationTest } from '@/components/InterestCalculationTest';
import { runAllTests } from '@/lib/testInterestCalculation';
import { useEffect, useState } from 'react';

export default function TestInterestPage() {
  const [testResults, setTestResults] = useState<string>('');

  useEffect(() => {
    // Run tests in console
    console.log('Running interest calculation tests...');
    const passed = runAllTests();
    setTestResults(passed ? '✅ All tests passed!' : '❌ Some tests failed. Check console for details.');
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Interest Calculation Test</h1>
          <p className="text-muted-foreground">
            Test the real-time interest calculation logic
          </p>
          {testResults && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              {testResults}
            </div>
          )}
        </div>

        <InterestCalculationTest />

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium mb-2">How to use:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Set the principal amount (e.g., 1200)</li>
            <li>Set the APR (e.g., 0.35%)</li>
            <li>Click "Start Test" to begin real-time calculation</li>
            <li>Watch the interest accumulate every second</li>
            <li>Check the console (F12) for detailed test logs</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="font-medium mb-2">Expected behavior:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Interest should increase gradually over time</li>
            <li>Balance = Principal + Interest</li>
            <li>After 1 year, interest should be approximately equal to APR% of principal</li>
            <li>Index should increase continuously</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}


