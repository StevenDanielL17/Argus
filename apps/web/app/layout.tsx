import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Argus",
  description: "Argus Market Intelligence Terminal",
  icons: {
    icon: "/favicon.svg",
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body style={{ margin: 0, fontFamily: "Segoe UI, sans-serif", background: "#0f1218", color: "#d7e2f0" }}>
        {isDemoMode && (
          <div style={{
            background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
            color: "#000",
            padding: "8px 16px",
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.5px",
          }}>
            🔒 Demo Mode — Read Only. Full access requires CLI installation.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
