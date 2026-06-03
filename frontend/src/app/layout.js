import { Inter } from "next/font/google";
import "./globals.css";
import NotificationProvider from "@/components/NotificationProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "QuickAid Admin Panel",
  description: "Campus task marketplace administration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
