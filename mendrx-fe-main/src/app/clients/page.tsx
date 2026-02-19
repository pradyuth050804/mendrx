// File: src/app/clients/page.tsx
import dynamic from "next/dynamic";

const ClientsClient = dynamic(() => import("./ClientsClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function ClientsPage() {
  return <ClientsClient />;
}
