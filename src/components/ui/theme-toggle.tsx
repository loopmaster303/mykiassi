'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  const current = theme === 'system' ? systemTheme : theme;
  return (
    <Button size="sm" variant="outline" onClick={() => setTheme(current === 'dark' ? 'light' : 'dark')}>
      {current === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </Button>
  );
}