"use client";

import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="logo">{process.env.NEXT_PUBLIC_APP_NAME ?? "DataGuard"}</div>
            <div className="header-subtitle">
              Personal Data &amp; Consent Management Dashboard
            </div>
          </header>
          <main className="app-main">{children}</main>
          <footer className="app-footer">
          Built by Yatesh Chandra Sai &mdash; Personal SDE Portfolio Project
          </footer>
        </div>
      </body>
    </html>
  );
}


