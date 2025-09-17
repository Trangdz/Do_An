import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import LendState from '@/context/LendState'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LendState>
      {/* Next.js recommends viewport meta in _app */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    </LendState>
  )
}


