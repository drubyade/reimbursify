"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyFormEditorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/forms");
  }, [router]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p style={{ color: "var(--text-muted)" }}>Redirecting to Form Management...</p>
    </div>
  );
}
