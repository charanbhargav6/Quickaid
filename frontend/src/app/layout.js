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
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#009ffc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `
            if (localStorage.getItem('theme') === 'dark') {
              document.body.classList.add('dark-theme');
            }
          `
        }} />
        <NotificationProvider>
          {children}
          <Toaster position="bottom-center" />
        </NotificationProvider>
      </body>
    </html>
  );
}
