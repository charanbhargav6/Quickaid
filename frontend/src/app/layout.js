import { Inter } from "next/font/google";
import "./globals.css";
import NotificationProvider from "@/components/NotificationProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "QuickAid – Fast Help, Trusted People",
  description: "QuickAid connects you with trusted local helpers for everyday tasks. Post a task, get help fast.",
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
