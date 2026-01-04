import { WebSocketProvider } from '@/contexts/WebSocketContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  )
}
