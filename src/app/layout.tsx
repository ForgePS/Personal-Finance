import type { Metadata } from "next";
import { AppLayout } from "@/components/app-layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Money Command — Personal Finance",
  description: "Track accounts, transactions, budgets, and goals in one place.",
  icons: {
    icon: "/logo-icon.png",
    apple: "/favicon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 font-sans antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
