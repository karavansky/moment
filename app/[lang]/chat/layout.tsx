import { WebSocketProvider } from '@/contexts/WebSocketContext'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  )
}
