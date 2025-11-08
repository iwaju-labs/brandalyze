import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - Brandalyze | User & Subscription Management",
  description: "Admin interface for managing user subscriptions and monitoring platform usage.",
  robots: {
    index: false, // Admin pages should not be indexed
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
