import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { ReportIssueFooter } from "@/components/site/report-issue-footer";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DesignBayInvoice",
  description: "Canadian invoice generation for independent businesses and studios.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ReportIssueFooter />
      </body>
    </html>
  );
}
