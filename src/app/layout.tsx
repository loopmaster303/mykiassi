import './globals.css';
import React from 'react';
import ThemeProviderWrapper from "@/components/ui/ThemeProviderWrapper";

export const metadata = {
  title: "MyKiassi",
  description: "Dein KI-Chatbot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <ThemeProviderWrapper>
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}