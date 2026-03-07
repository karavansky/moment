import type { Metadata } from "next";
import "./globals.css";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

export const metadata: Metadata = {
  title: "Überwachungssystem",
  description: "Real-time Überwachungssystem powered by Vapor WebSocket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 dark:bg-gray-900">
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  );
}
