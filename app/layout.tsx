import type { Viewport } from 'next'
import './[lang]/globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'auto',
}

// Minimal root layout - just returns children
// The actual HTML structure is in /app/page.tsx for root route
// and /app/[lang]/layout.tsx for language routes
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
