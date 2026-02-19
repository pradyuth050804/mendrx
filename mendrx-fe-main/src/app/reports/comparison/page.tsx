// File: src/app/reports/comparison/page.tsx
import ComparisonClientWrapper from "./ComparisonClientWrapper";

export default function ComparisonPage({
  searchParams,
}: {
  searchParams: { reports: string };
}) {
  return <ComparisonClientWrapper comparisonId={searchParams.reports} />;
}
