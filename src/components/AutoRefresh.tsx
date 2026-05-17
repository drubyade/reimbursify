"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Silently refresh the RSC payload every 0.5 seconds
    const interval = setInterval(() => {
      router.refresh();
    }, 500);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
