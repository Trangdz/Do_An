import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import LendState from '@/context/LendState'
import { ToastProvider } from '@/components/ui/Toast'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LendState>
      <ToastProvider>
        {/* Next.js recommends viewport meta in _app */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Initialize theme on the client */}
        <ThemeInitializer />
        {/* Silence MetaMask user-cancel overlays in dev */}
        <GlobalUserCancelSilencer />
        <Component {...pageProps} />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </ToastProvider>
    </LendState>
  )
}


function ThemeInitializer() {
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldDark = stored ? stored === 'dark' : prefersDark;
      const root = document.documentElement;
      if (shouldDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch {}
  }, []);
  return null;
}

function GlobalUserCancelSilencer() {
  useEffect(() => {
    const isUserCancelled = (msg: any): boolean => {
      try {
        const str = typeof msg === 'string' ? msg : JSON.stringify(msg || {});
        return /ACTION_REJECTED|code[^\d]?4001|user denied|denied transaction signature/i.test(str);
      } catch {
        return false;
      }
    };

    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (isUserCancelled(e?.reason)) {
        // Prevent Next.js dev overlay for MetaMask cancel
        e.preventDefault();
      }
    };
    const onError = (e: ErrorEvent) => {
      if (isUserCancelled(e?.message)) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandled);
      window.removeEventListener('error', onError);
    };
  }, []);
  return null;
}

