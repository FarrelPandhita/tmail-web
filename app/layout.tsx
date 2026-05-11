import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "TMail — OTP Email Dashboard",
    template: "%s | TMail",
  },
  description:
    "Secure OTP email dashboard. Manage your generated email inbox with ease.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <body
        className={`${poppins.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                fontFamily: "var(--font-poppins, Poppins, sans-serif)",
                fontSize: "0.875rem",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
