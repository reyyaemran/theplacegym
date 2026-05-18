import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { Montserrat } from "next/font/google";

import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

// Google Sans Flex loaded via link to avoid Next.js font override warning (no metrics in next/font)
const GOOGLE_SANS_FLEX_URL =
  "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;600;700&display=swap";


export const metadata: Metadata = {
  title: "THE PLACE - PT Business Management",
  description:
    "Premium PT business management platform for managing staff, clients, and performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_SANS_FLEX_URL} />
      </head>
      <body className={`font-sans ${montserrat.variable} ${GeistMono.variable} antialiased`}>
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
