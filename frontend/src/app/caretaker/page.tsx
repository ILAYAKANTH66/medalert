"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/** Caretaker hub redirects to dashboard monitoring view */
export default function CaretakerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/login");
      else router.replace("/dashboard");
    }
  }, [user, loading, router]);

  return <LoadingSpinner fullScreen label="Opening caretaker dashboard..." />;
}
