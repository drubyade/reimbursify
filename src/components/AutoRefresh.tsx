"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if the browser tab is active
      if (document.visibilityState !== "visible") return;
      
      // Only start a new refresh if the previous one has completed
      if (!isPending) {
        startTransition(() => {
          router.refresh();
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [router, isPending]);

  return null;
}
