import { MemberDetailPage } from "@/features/dashboard/pages/members/detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <MemberDetailPage params={params} />;
}
