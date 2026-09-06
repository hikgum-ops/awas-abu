import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "Awas Abu — Cek Informasi Abu Vulkanik",
  description:
    "Cek informasi abu vulkanik berdasarkan lokasi atau kecamatan dari sumber resmi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
