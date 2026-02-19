// src/lib/protocolDataFetchers.ts
import { getApiUrl } from "@/utils/api";

export interface ProtocolData {
  rootCauseAnalysis?: any;
  supplements?: any;
  dietPlan?: any;
  lifestyleRecommendations?: any;
}

export interface ProtocolOptions {
  includeRCASummary: boolean;
  includeRCABreakdown: boolean;
  includeSupplements: boolean;
  includeDietPlan: boolean;
  includeLifestyleRec: boolean;
}

/**
 * Fetches data needed for Protocol PDF generation
 */
export const fetchProtocolData = async (
  authToken: string,
  reportId: string,
  options: ProtocolOptions
): Promise<ProtocolData> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error("API URL is not configured");
  }

  const data: ProtocolData = {};
  const fetchPromises: Promise<void>[] = [];

  // Fetch RCA data if either RCA option is selected
  if (options.includeRCASummary || options.includeRCABreakdown) {
    const rcaPromise = fetch(`${apiUrl}/reports/${reportId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch RCA data");
        return res.json();
      })
      .then((result) => {
        if (!result.success) throw new Error(result.message || "Failed to parse RCA data");
        data.rootCauseAnalysis = result.data;
      })
      .catch((error) => {
        console.error("Error fetching RCA data:", error);
        throw error;
      });

    fetchPromises.push(rcaPromise);
  }

  // Fetch Supplements & Diet plan if selected
  if (options.includeSupplements || options.includeDietPlan) {
    const sndPromise = fetch(`${apiUrl}/snd-plan/${reportId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch supplements and diet plan");
        return res.json();
      })
      .then((result) => {
        if (!result.success) throw new Error(result.message || "Failed to parse supplements and diet plan");
        
        
        if (options.includeSupplements && result.data && result.data.supplements) {
          data.supplements = result.data.supplements;
        }
        
        if (options.includeDietPlan && result.data) {
          // Handle different possible data structures for diet plan
          if (result.data.dietPlan) {
            // Directly set the diet plan data
            data.dietPlan = result.data.dietPlan;
          } else if (result.data.plan && result.data.plan.dietPlan) {
            // Extract from plan.dietPlan if that's the structure
            data.dietPlan = result.data.plan.dietPlan;
            // Also grab diet notes if they exist
            if (result.data.plan.dietNotes) {
              if (!data.dietPlan.dietNotes) {
                data.dietPlan = {
                  ...data.dietPlan,
                  dietNotes: result.data.plan.dietNotes
                };
              }
            }
          } else if (result.data.dietPlanVersions && Array.isArray(result.data.dietPlanVersions) && result.data.dietPlanVersions.length > 0) {
            // Extract from the newest version (last element in array)
            const latestVersion = result.data.dietPlanVersions[result.data.dietPlanVersions.length - 1]; // Most recent version last
            if (latestVersion.dayPlans && Array.isArray(latestVersion.dayPlans)) {
              data.dietPlan = latestVersion.dayPlans;
              
              // Also add diet notes if they exist
              if (latestVersion.dietNotes) {
                data.dietPlan = {
                  dayPlans: latestVersion.dayPlans,
                  dietNotes: latestVersion.dietNotes
                };
              }
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching supplements and diet plan:", error);
        throw error;
      });

    fetchPromises.push(sndPromise);
  }

  // Fetch Lifestyle Recommendations if selected
  if (options.includeLifestyleRec) {
    const lifestylePromise = fetch(`${apiUrl}/lifestyle-rec/report/${reportId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch lifestyle recommendations");
        return res.json();
      })
      .then((result) => {
        if (!result.success) throw new Error(result.message || "Failed to parse lifestyle recommendations");
        
        // Store the original data
        data.lifestyleRecommendations = result.data;
        
        // Check if recommendationData exists and needs to be parsed
        if (result.data && 
            result.data.lifestyleRecommendations && 
            typeof result.data.lifestyleRecommendations === 'object' &&
            result.data.lifestyleRecommendations.recommendationData) {
          
        }
      })
      .catch((error) => {
        console.error("Error fetching lifestyle recommendations:", error);
        throw error;
      });

    fetchPromises.push(lifestylePromise);
  }

  // Wait for all fetch operations to complete
  await Promise.all(fetchPromises);
  
  return data;
};