"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, [pathname]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {children}
    </div>
  );
}
