"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WastageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/expenses");
  }, [router]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-ink-500">
      Redirecting to Expenses &amp; Wastage…
    </div>
  );
}
