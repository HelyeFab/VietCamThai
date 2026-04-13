"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("vct-dark-mode");
    const isDark = stored !== "false";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("vct-dark-mode", String(next));
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
      aria-label={dark ? "Modalità chiara" : "Modalità scura"}
    >
      {dark ? <Sun className="w-5 h-5 text-text" /> : <Moon className="w-5 h-5 text-text" />}
    </button>
  );
}
