// src/app/reports/[id]/page.tsx
import dynamic from "next/dynamic";
import { ParameterCommentsProvider } from "@/contexts/ParameterCommentsContext";

const ReportViewClient = dynamic(() => import("./ReportsViewClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

interface ReportPageProps {
  params: {
    id: string;
  };
}

export default function ReportPage({ params }: ReportPageProps) {
  return (
    <ParameterCommentsProvider>
      <ReportViewClient reportId={params.id} />
    </ParameterCommentsProvider>
  );
}
