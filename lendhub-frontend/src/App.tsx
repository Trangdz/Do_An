import { SimpleDashboard } from './components/SimpleDashboard';
import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <ToastProvider>
      <SimpleDashboard />
    </ToastProvider>
  );
}

export default App;