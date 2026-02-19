// src/utils/lifestyleRecommendationsPdfGenerator.tsx (or adjust path)
import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font, // Import Font if using custom fonts
  Image, // Added for Logo and Signature
  // PDFViewer, // Optional: For viewing in browser during development
  // renderToStream, // For server-side or Node context
} from "@react-pdf/renderer";
import { ClientInfo } from "@/types/client-info"; // Assuming this path is correct
import { formatGender, formatDiet, formatEnumValue } from "./formatters"; // Assuming these exist
import { DEFAULT_DISCLAIMER } from "@/constants/disclaimers"; // Assuming this path is correct

// --- Interfaces ---
// (Keep RecommendationPanel and RecommendationItem as they were)
type RecommendationItem = Record<string, string>;

interface RecommendationPanel {
  panelName: string;
  items: RecommendationItem[];
}

interface WhiteLabelConfig {
  enabled: boolean;
  useParentWhiteLabels: boolean;
  type: "LOGO" | "TEXT";
  logoUrl?: string;
  text?: string;
  customDisclaimer?: string;
  signoffSignatureFileName?: string;
  signoffDesignation?: string;
  signoffName?: string;
  watermarkUrl?: string;
}

interface LifestyleRecommendationsPDFGeneratorProps {
  parsedPanels: RecommendationPanel[] | null;
  clientInfo?: ClientInfo; // Added ClientInfo prop
  whiteLabelConfig?: WhiteLabelConfig; // Added WhiteLabelConfig prop
  parseError?: string;
}

// --- Styles ---
// Merged and adapted styles from both files
const styles = StyleSheet.create({
  page: {
    paddingTop: 30, // Consistent padding
    paddingBottom: 60, // Increased bottom padding for footer elements
    paddingHorizontal: 30,
    fontSize: 9, // Base font size
    fontFamily: "Helvetica",
    backgroundColor: "white",
    color: "#374151", // Default text color
  },
  // Header Styles (from sndPdfGenerator)
  header: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 20, // Spacing after header
  },
  headerLogo: {
    marginBottom: 15,
    alignSelf: "flex-end", // Logo to the right
  },
  logoImage: {
    maxWidth: 300,
    maxHeight: 150,
    objectFit: "contain",
  },
  whiteLabelText: {
    fontSize: 10,
    color: "#374151",
    fontFamily: "Helvetica",
    textAlign: "right",
    width: 200,
    marginLeft: "auto",
  },
  // Title Style (Adapted)
  title: {
    fontSize: 16, // Slightly smaller than original Lifestyle header
    fontWeight: 700, // Bold
    textAlign: "left", // Title aligned left
    color: "#111827",
    marginTop: 10, // Space below logo
  },
  introText: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 15,
    lineHeight: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626", // Red color for errors
    textAlign: "center",
    marginTop: 40,
  },
  // Section Title (Adapted from LifestyleRecommendations)
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700, // Bold
    marginBottom: 10,
    marginTop: 20, // Space before section title
    color: "#1F2937",
    paddingBottom: 8, // Add underline effect
    borderBottom: "1pt solid #E5E7EB", // Add underline effect
  },
  // Dynamic Table Styles (Keep as they were)
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 15,
    borderCollapse: "collapse", // Use collapse if desired, check compatibility
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    minHeight: 20,
  },
  tableRowAlternate: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    minHeight: 20,
  },
  tableHeaderContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  tableHeaderCell: {
    fontWeight: "bold",
    padding: 5,
    fontSize: 8.5,
    color: "#374151",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    textAlign: "left",
    flexGrow: 1,
    flexShrink: 1,
  },
  tableCell: {
    padding: 5,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    color: "#4B5563",
    textAlign: "left",
    flexGrow: 1,
    flexShrink: 1,
    lineHeight: 1.4, // Added for better readability in cells
  },
  noBorderRight: {
    borderRightWidth: 0,
  },
  // Signature Section Styles (from sndPdfGenerator)
  signatureSection: {
    marginTop: "auto", // Push to bottom
    paddingTop: 20, // Space above signature
    marginBottom: 10, // Space below signature, before disclaimer
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end", // Align to the right
  },
  signatureContent: {
    width: 200, // Fixed width for content alignment
    display: "flex",
    flexDirection: "column",
    alignItems: "center", // Center items within the content block
  },
  signatureImage: {
    width: 120,
    height: 45,
    marginBottom: 4,
    objectFit: "contain",
    alignSelf: "center",
    flexShrink: 0,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
    textAlign: "center",
  },
  signatureDesignation: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 4,
    textAlign: "center",
  },
  signatureDate: {
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center",
  },
  // Disclaimer Style (from sndPdfGenerator)
  disclaimer: {
    paddingTop: 15, // Space above disclaimer
    borderTop: "1pt solid #E5E7EB",
    fontSize: 8,
    color: "#6B7280",
    textAlign: "justify",
    lineHeight: 1.4,
  },
  // Page Number Style (Keep as it was)
  pageNumber: {
    position: "absolute",
    fontSize: 8,
    bottom: 30, // Position from bottom
    left: 0,
    right: 0,
    textAlign: "center",
    color: "grey",
  },
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkImage: {
    width: "60%",
    opacity: 0.1,
    objectFit: "contain",
  },
});

const Watermark: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <View style={styles.watermarkContainer} fixed>
    <Image src={imageUrl} style={styles.watermarkImage} />
  </View>
);

// --- PDF Component ---
const LifestyleRecommendationsPDFGenerator: React.FC<
  LifestyleRecommendationsPDFGeneratorProps
> = ({
  parsedPanels,
  clientInfo, // Receive clientInfo
  whiteLabelConfig, // Receive whiteLabelConfig
  parseError,
}) => {
  // --- Dynamic Table Rendering Function ---
  const renderDynamicPanelTable = (
    panel: RecommendationPanel,
    panelIndex: number
  ) => {
    const columnSet = new Set<string>();
    panel.items.forEach((item) => {
      Object.keys(item).forEach((key) => columnSet.add(key));
    });
    const columns = Array.from(columnSet).sort();
    const numColumns = columns.length;
    const columnWidth = numColumns > 0 ? `${100 / numColumns}%` : "100%";

    return (
      <View style={{ marginBottom: 20 }} wrap={false}>
        <Text style={styles.sectionTitle}>{panel.panelName}</Text>
        <View style={styles.table}>
          {/* Table Header */}
          {numColumns > 0 && (
            <View style={styles.tableHeaderContainer} fixed>
              {columns.map((colName, colIndex) => (
                <View
                  key={colName}
                  style={[
                    styles.tableHeaderCell,
                    { flexBasis: columnWidth },
                    colIndex === numColumns - 1 ? styles.noBorderRight : {},
                  ]}
                >
                  <Text>{colName}</Text>
                </View>
              ))}
            </View>
          )}
          {/* Table Rows */}
          {panel.items.map((item, itemIndex) => (
            <View
              key={`item-${itemIndex}`}
              style={
                itemIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlternate
              }
              wrap={false} // Prevent individual rows from breaking mid-row
            >
              {columns.map((colName, colIndex) => (
                <View
                  key={`${colName}-${itemIndex}`}
                  style={[
                    styles.tableCell,
                    { flexBasis: columnWidth },
                    colIndex === numColumns - 1 ? styles.noBorderRight : {},
                  ]}
                >
                  <Text>{item[colName] || ""}</Text>
                </View>
              ))}
            </View>
          ))}
          {panel.items.length === 0 && (
            <View style={styles.tableRow}>
              <View
                style={[
                  styles.tableCell,
                  { flexBasis: "100%", textAlign: "center", color: "#6B7280" },
                ]}
              >
                <Text>No items found for this panel.</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Get the logo URL based on white label configuration
  const getLogoUrl = () => {
    if (
      (whiteLabelConfig?.enabled || whiteLabelConfig?.useParentWhiteLabels) &&
      whiteLabelConfig.type === "LOGO" &&
      whiteLabelConfig.logoUrl
    ) {
      return whiteLabelConfig.logoUrl;
    }
    return "/mendrx_pdf_logo.png"; // Default logo
  };

  // Render header (only for first page)
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLogo}>
        {(whiteLabelConfig?.enabled ||
          whiteLabelConfig?.useParentWhiteLabels) &&
        whiteLabelConfig.type === "TEXT" ? (
          <Text style={styles.whiteLabelText}>{whiteLabelConfig.text}</Text>
        ) : (
          <Image src={getLogoUrl()} style={styles.logoImage} />
        )}
      </View>
      <Text style={styles.title}>Lifestyle Recommendations</Text>
    </View>
  );

  // Render signature and disclaimer (for last page)
  const renderSignatureAndDisclaimer = () => (
    <>
      {/* Signature Section */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureContent}>
          {(whiteLabelConfig?.enabled ||
            whiteLabelConfig?.useParentWhiteLabels) &&
            whiteLabelConfig.signoffSignatureFileName && (
              <Image
                src={whiteLabelConfig.signoffSignatureFileName}
                style={styles.signatureImage}
              />
            )}
          <Text style={styles.signatureName}>
            {(whiteLabelConfig?.enabled ||
              whiteLabelConfig?.useParentWhiteLabels) &&
            whiteLabelConfig.signoffName
              ? whiteLabelConfig.signoffName
              : ""}
          </Text>
          <Text style={styles.signatureDesignation}>
            {(whiteLabelConfig?.enabled ||
              whiteLabelConfig?.useParentWhiteLabels) &&
            whiteLabelConfig.signoffDesignation
              ? whiteLabelConfig.signoffDesignation
              : ""}
          </Text>
          {((whiteLabelConfig?.enabled ||
            whiteLabelConfig?.useParentWhiteLabels) &&
            (whiteLabelConfig.signoffName ||
              whiteLabelConfig.signoffDesignation)) ||
          ((whiteLabelConfig?.enabled ||
            whiteLabelConfig?.useParentWhiteLabels) &&
            whiteLabelConfig.signoffSignatureFileName) ? (
            <Text style={styles.signatureDate}>
              {new Date().toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Disclaimer Section */}
      <View style={styles.disclaimer}>
        <Text>
          {(whiteLabelConfig?.enabled ||
            whiteLabelConfig?.useParentWhiteLabels) &&
          whiteLabelConfig.customDisclaimer
            ? whiteLabelConfig.customDisclaimer
            : DEFAULT_DISCLAIMER}
        </Text>
      </View>
    </>
  );

  // --- Document Structure ---
  return (
    <Document>
      {/* First Page with Header - Client Info Removed */}
      <Page size="A4" style={styles.page}>
        {renderHeader()}

        {/* Handle Parse Error */}
        {parseError && (
          <Text style={styles.errorText}>
            Error: Could not generate PDF. Failed to parse recommendation data.
            {"\n"}({parseError})
          </Text>
        )}

        {/* Show message if no panels after successful parse */}
        {!parseError && parsedPanels?.length === 0 && (
          <Text style={styles.introText}>
            No lifestyle recommendation panels found for this client.
          </Text>
        )}

        {/* If there are panels, render first panel on first page */}
        {!parseError &&
          parsedPanels &&
          parsedPanels.length > 0 &&
          renderDynamicPanelTable(parsedPanels[0], 0)}

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
        {whiteLabelConfig?.useParentWhiteLabels &&
          whiteLabelConfig?.watermarkUrl && (
            <Watermark imageUrl={whiteLabelConfig.watermarkUrl} />
          )}
      </Page>

      {/* Generate pages for remaining panels (starting from index 1) */}
      {!parseError &&
        parsedPanels &&
        parsedPanels.length > 1 &&
        parsedPanels.slice(1).map((panel, index) => (
          <Page key={`page-${index + 1}`} size="A4" style={styles.page}>
            {/* No header on subsequent pages */}

            {/* Render the panel */}
            {renderDynamicPanelTable(panel, index + 1)}

            {/* Page Number */}
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
              fixed
            />
            {whiteLabelConfig?.useParentWhiteLabels &&
              whiteLabelConfig?.watermarkUrl && (
                <Watermark imageUrl={whiteLabelConfig.watermarkUrl} />
              )}
          </Page>
        ))}

      {/* Last Page with Signature and Disclaimer */}
      {!parseError && parsedPanels && parsedPanels.length > 0 && (
        <Page size="A4" style={styles.page}>
          {/* No header on disclaimer page */}

          {renderSignatureAndDisclaimer()}

          {/* Page Number */}
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
            fixed
          />
          {whiteLabelConfig?.useParentWhiteLabels &&
            whiteLabelConfig?.watermarkUrl && (
              <Watermark imageUrl={whiteLabelConfig.watermarkUrl} />
            )}
        </Page>
      )}
    </Document>
  );
};

// --- Utility Function to Generate PDF ---
export const generateLifestyleRecPDF = async (
  recommendationJsonData: string, // Accept JSON string
  whiteLabelConfig?: WhiteLabelConfig, // Accept WhiteLabelConfig
  clientInfo?: ClientInfo // Accept ClientInfo
): Promise<string> => {
  // Dynamically import the 'pdf' function
  const { pdf } = await import("@react-pdf/renderer");

  let parsedPanels: RecommendationPanel[] | null = null;
  let parseError: string | undefined = undefined;
  try {
    if (recommendationJsonData && recommendationJsonData.trim() !== "") {
      parsedPanels = JSON.parse(recommendationJsonData);
      if (!Array.isArray(parsedPanels)) {
        console.error(
          "Parsed recommendation data is not an array:",
          parsedPanels
        );
        throw new Error(
          "Recommendation data is not in the expected format (array of panels)."
        );
      }
      // Add more specific validation if needed (e.g., check panel structure)
    } else {
      parsedPanels = []; // Handle empty/null input string as empty panels
    }
  } catch (error) {
    console.error("Failed to parse recommendation JSON for PDF:", error);
    parseError =
      error instanceof Error ? error.message : "Unknown parsing error";
    parsedPanels = null; // Ensure panels are null if parsing fails
  }

  // Render the PDF component to a blob
  const blob = await pdf(
    <LifestyleRecommendationsPDFGenerator
      parsedPanels={parsedPanels}
      clientInfo={clientInfo} // Pass clientInfo
      whiteLabelConfig={whiteLabelConfig} // Pass whiteLabelConfig
      parseError={parseError}
    />
  ).toBlob();

  // Create and return an object URL for the blob
  return URL.createObjectURL(blob);
};

export default LifestyleRecommendationsPDFGenerator; // Keep default export if needed
