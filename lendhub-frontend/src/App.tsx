import { SimpleDashboard } from './components/SimpleDashboard';
import { ToastProvider } from './components/ui/Toast';
import LendState from './context/LendState';

function App() {
  return (
    <ToastProvider>
      <LendState>
        <SimpleDashboard />
      </LendState>
    </ToastProvider>
  );
}

export default App;