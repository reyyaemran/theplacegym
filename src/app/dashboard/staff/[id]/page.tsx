import { StaffDetailPage } from "@/features/dashboard/pages/staff/detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffDetailPage params={params} />;
}

