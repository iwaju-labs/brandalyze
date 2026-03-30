"use client";

import Link from "next/link";
import { Shield01 } from "@untitledui/icons";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export function AdminLink() {
  const { isAdmin, isLoading } = useAdminStatus();
  
  if (isLoading || !isAdmin) {
    return null;
  }
  
  return (
    <Link
      href="/admin"
      className="text-black dark:text-white hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex items-center gap-1"
      title="Admin Dashboard"
    >
      <Shield01 size={20} />
      <span className="text-sm">admin</span>
    </Link>
  );
}
