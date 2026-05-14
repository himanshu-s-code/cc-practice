import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventory UI",
  description: "Day 3: Next.js + shadcn/ui inventory front-end",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteNav />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
