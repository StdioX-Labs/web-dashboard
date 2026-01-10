import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SoldOutAfrica Dashboard",
    template: "%s | SoldOutAfrica Dashboard",
  },
  description: "Event organizer dashboard for managing events and ticket sales",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="format-detection" content="telephone=no"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta charSet="UTF-8"/>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent MetaMask from auto-connecting
              if (typeof window !== 'undefined') {
                window.ethereum = undefined;
                window.web3 = undefined;
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
