'use client';

import LendState from '../context/LendState';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LendState>
          {children}
        </LendState>
      </body>
    </html>
  )
}
