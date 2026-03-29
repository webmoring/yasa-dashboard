import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YASA : Joseon Pipeline',
  description: 'YouTube Shorts Automation Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
