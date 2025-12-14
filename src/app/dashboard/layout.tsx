import DashboardLayoutWrapper from "@/features/dashboard/components/dashboard-layout";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </ErrorBoundary>
  );
}
