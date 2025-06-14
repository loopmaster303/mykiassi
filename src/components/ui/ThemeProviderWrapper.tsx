// src/components/ui/ThemeProviderWrapper.tsx
'use client';
import { ThemeProvider } from 'next-themes';

export default function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system"  // Respektiert OS-Einstellungen
      enableSystem={true}   // Erkennt automatisch Dark/Light Mode des Systems
      disableTransitionOnChange={false}  // Verhindert Flackern beim Theme-Wechsel
    >
      {children}
    </ThemeProvider>
  );
}