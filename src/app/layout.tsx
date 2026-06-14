import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { DemoBadge } from "@/components/DemoBadge";

export const metadata: Metadata = {
  title: "Кафе POS — QR меню жана башкаруу",
  description: "QR меню, касса, ашкана жана админ панел — бирдиктүү система",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ky" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <DemoBadge />
      </body>
    </html>
  );
}
