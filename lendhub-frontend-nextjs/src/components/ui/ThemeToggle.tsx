import React, { useCallback, useEffect, useState } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = stored ? stored === 'dark' : prefersDark;
      setIsDark(initialDark);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    if (next) {
      root.classList.add('dark');
      try { localStorage.setItem('theme', 'dark'); } catch {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('theme', 'light'); } catch {}
    }
  }, [isDark]);

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      title={isDark ? 'Chuyển sáng' : 'Chuyển tối'}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}