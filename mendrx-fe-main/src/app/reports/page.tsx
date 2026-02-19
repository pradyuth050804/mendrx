// File: src/app/reports/page.tsx
import dynamic from "next/dynamic";

const ReportsClient = dynamic(() => import("./ReportsClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function ReportsPage() {
  return <ReportsClient />;
}
