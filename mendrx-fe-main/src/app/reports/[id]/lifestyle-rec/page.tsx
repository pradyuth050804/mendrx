// src/app/reports/[id]/lifestyle-rec/page.tsx
import React from "react";
import LifestyleRecViewClient from "./LifestyleRecViewClient"; // Import the client component

interface LifestyleRecPageProps {
  params: {
    id: string; // Report ID from the URL
  };
}

// Optional: Fetch initial data or check auth server-side if required
// async function getInitialData(reportId: string) {
//   const authClient = createAuthClient();
//   const { data: { session } } = await authClient.auth.getSession();
//   if (!session) {
//     redirect("/"); // Redirect to login if not authenticated
//   }
//   // You could potentially fetch clientInfo here if needed by LifestyleRecViewClient
//   // const apiUrl = process.env.NEXT_PUBLIC_PROD_API_URL || process.env.NEXT_PUBLIC_DEV_API_URL || process.env.NEXT_PUBLIC_LOCAL_API_URL;
//   // const clientInfoResponse = await fetch(`${apiUrl}/reports/${reportId}/client-info`, { headers: { Authorization: `Bearer ${session.access_token}` } });
//   // const clientInfoData = await clientInfoResponse.json();
//   // return { clientInfo: clientInfoData.success ? clientInfoData.data : null };
//   return { clientInfo: null }; // Placeholder
// }

const LifestyleRecPage: React.FC<LifestyleRecPageProps> = async ({
  params,
}) => {
  const reportId = params.id;

  // Optional: Fetch initial data on the server
  // const { clientInfo } = await getInitialData(reportId);

  return (
    <div>
      {/* Render the client component, passing the reportId */}
      <LifestyleRecViewClient
        reportId={reportId}
        // clientInfo={clientInfo} // Pass clientInfo if fetched
      />
    </div>
  );
};

export default LifestyleRecPage;
