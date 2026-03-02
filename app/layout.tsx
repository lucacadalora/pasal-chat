import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pasal Chat — AI Legal Assistant for Indonesian Law",
  description:
    "Ask questions about Indonesian law and get grounded answers with exact citations from 937,000+ legal articles. Powered by pasal.id database.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body style={{ height: "100vh", overflow: "hidden" }}>{children}</body>
    </html>
  );
}
