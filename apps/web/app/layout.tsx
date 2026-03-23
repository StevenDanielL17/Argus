import type { ReactNode } from "react";

export const metadata = {
  title: "Argus",
  description: "Argus Market Intelligence Terminal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Segoe UI, sans-serif", background: "#0f1218", color: "#d7e2f0" }}>
        {children}
      </body>
    </html>
  );
}
