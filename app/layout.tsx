import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SAMC FM Preceptor Coverage Dashboard',
  description: 'AMION-based preceptor shortage and overage tracking for SAMC FM Outpatient',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}
