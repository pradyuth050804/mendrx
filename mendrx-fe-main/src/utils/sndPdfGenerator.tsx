// File: src/utils/sndPdfGenerator.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer";
import { ClientInfo } from "@/types/client-info";
import { formatGender, formatDiet, formatEnumValue } from "./formatters";
import { createAuthClient } from "@/lib/supabase-auth";
import { getApiUrl } from "@/utils/api";
import { DEFAULT_DISCLAIMER } from "@/constants/disclaimers";

interface SignOffData {
  name: string;
  designation: string;
  signatureUrl?: string;
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

interface SNDPDFInput {
  plan: SnDPlan;
  clientInfo: ClientInfo;
  whiteLabelConfig?: WhiteLabelConfig;
  signOffData?: SignOffData;
}
interface Supplement {
  name: string;
  purpose: string;
  timing: string;
  dosage: string;
  precautions: string;
  timingCategory: string;
  brandSuggestionsAndGuidelines: string;
}

interface DayPlan {
  day: string;
  preMorning: string;
  morning: string;
  midMorning: string;
  lunch: string;
  earlyEvening: string;
  night: string;
  bedtime: string;
}

interface SnDPlan {
  supplements: Supplement[];
  dietPlan: DayPlan[];
  supplementNotes?: string;
  dietNotes?: string;
  supplementsEnabled: boolean;
  dietPlanEnabled: boolean;
}

// URL detection function
const isUrl = (text: string): boolean => {
  if (!text) return false;
  // Simple URL detection regex
  const urlPattern = /^(https?:\/\/|www\.)[^\s]+\.[^\s]+/i;
  return urlPattern.test(text.trim());
};

// Main styles
const styles = StyleSheet.create({
  page: {
    padding: "30",
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "white",
  },
  header: {
    flexDirection: "column", // Changed from "row" to "column"
    alignItems: "stretch",
    marginBottom: 30,
  },
  headerLogo: {
    marginBottom: 15, // Add space between logo and title
    alignSelf: "flex-end", // Align to the right
  },
  logoImage: {
    maxWidth: 300, // Maximum width constraint
    maxHeight: 150, // Maximum height constraint
    objectFit: "contain",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "left",
    color: "#111827",
    flex: 1,
  },
  clientInfoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    padding: 15,
    marginBottom: 20,
    border: "1pt solid #E5E7EB",
  },
  clientInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  clientInfoColumn: {
    width: "50%",
    marginBottom: 8,
  },
  clientInfoRow: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    color: "#374151",
    fontWeight: 500,
    marginRight: 5,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  value: {
    color: "#111827",
    fontSize: 10,
  },
  // Section styles
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#111827",
    paddingBottom: 8,
    borderBottom: "1pt solid #E5E7EB",
  },
  // Supplement card styles
  // Supplement styles
  supplementCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    border: "1pt solid #E5E7EB",
  },
  supplementName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
    borderBottom: "1pt solid #E5E7EB",
    paddingBottom: 6,
  },
  fieldContainer: {
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 20,
  },
  fieldColumn: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: 900,
    color: "#374151",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 9,
    color: "#111827",
    flex: 1,
  },
  fieldValueCompact: {
    fontSize: 9,
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  // Diet plan styles
  dayCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    border: "1pt solid #E5E7EB",
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#111827",
    paddingBottom: 8,
    borderBottom: "1pt solid #E5E7EB",
  },
  mealRow: {
    marginBottom: 8,
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  mealValue: {
    color: "#111827",
    lineHeight: 1.4,
  },
  notes: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    color: "#374151",
    lineHeight: 1.4,
    fontSize: 9,
  },
  timingCategoryContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    border: "1pt solid #E5E7EB",
  },
  timingCategoryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: "1pt solid #E5E7EB",
  },
  supplementsContainer: {
    gap: 16,
  },
  supplementGrid: {
    width: "100%",
    border: "1pt solid #E5E7EB", // Add border around the entire grid
  },
  gridHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottom: "1pt solid #E5E7EB",
  },
  gridRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #E5E7EB",
    minHeight: 40,
  },
  gridCell: {
    fontSize: 9,
    color: "#111827",
    padding: 8,
    justifyContent: "center", // Better vertical alignment
  },
  headerCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    padding: 8,
  },
  nameColumn: {
    width: "20%",
    borderRight: "1pt solid #E5E7EB",
  },
  purposeColumn: {
    width: "35%",
    borderRight: "1pt solid #E5E7EB",
  },
  timingColumn: {
    width: "20%",
    borderRight: "1pt solid #E5E7EB",
  },
  brandColumn: {
    width: "25%",
  },
  urlText: {
    color: "#3B82F6", // Blue color for links
    textDecoration: "underline",
    fontSize: 9, // Match gridCell
    fontFamily: "Helvetica",
  },
  baseText: {
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica", // Ensure consistency
    // Note: lineHeight might be better applied to the container View for wrapping layout
  },
  baseTextInline: {
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  disclaimer: {
    marginTop: "auto",
    paddingTop: 20,
    borderTop: "1pt solid #E5E7EB",
    fontSize: 8,
    color: "#6B7280",
    textAlign: "justify",
    lineHeight: 1.4,
  },
  whiteLabelText: {
    fontSize: 10,
    color: "#374151",
    fontFamily: "Helvetica",
    textAlign: "right",
    width: 200,
    marginLeft: "auto",
  },
  signatureSection: {
    marginTop: "auto",
    marginBottom: 20,
    paddingTop: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureContent: {
    width: 200,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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

const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const renderTextWithLinks = (text: string | null | undefined) => {
  if (!text) return <Text style={styles.baseTextInline}></Text>;
  const parts = text.split(urlRegex);

  return (
    <Text style={styles.baseTextInline}>
      {" "}
      {/* Wrap in Text for flow */}
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.match(urlRegex)) {
          const linkHref = part.startsWith("www.") ? `https://${part}` : part;
          return (
            <Link key={index} src={linkHref}>
              <Text style={styles.urlText}>{part}</Text> {/* Link styled */}
            </Link>
          );
        } else {
          return <Text key={index}>{part}</Text>;
          {
            /* Regular text */
          }
        }
      })}
    </Text>
  );
};

const groupSupplementsByTiming = (supplements: Supplement[]) => {
  const groups: Record<string, Supplement[]> = {
    morning: [],
    afternoon: [],
    night: [],
    "Not Specified": [],
  };

  supplements.forEach((supplement) => {
    const category = supplement.timingCategory || "Not Specified";
    groups[category] = groups[category] || [];
    groups[category].push(supplement);
  });

  return groups;
};

const SupplementGrid: React.FC<{ supplements: Supplement[] }> = ({
  supplements,
}) => (
  <View style={styles.supplementGrid}>
    {/* Header Row */}
    <View style={styles.gridHeader}>
      <View style={[styles.headerCell, styles.nameColumn]}>
        <Text>Name</Text>
      </View>
      <View style={[styles.headerCell, styles.purposeColumn]}>
        <Text>Purpose</Text>
      </View>
      <View style={[styles.headerCell, styles.timingColumn]}>
        <Text>Timing & Dosage</Text>
      </View>
      <View style={[styles.headerCell, styles.brandColumn]}>
        <Text>Brand Suggestions & Guidelines</Text>
      </View>
    </View>

    {/* Data Rows */}
    {supplements.map((supplement, index) => (
      <View key={index} style={styles.gridRow}>
        {/* Name Column */}
        <View style={[styles.gridCell, styles.nameColumn]}>
          <Text>{supplement.name}</Text>
        </View>
        {/* Purpose Column */}
        <View style={[styles.gridCell, styles.purposeColumn]}>
          <Text>{supplement.purpose}</Text>
        </View>
        {/* Timing & Dosage Column */}
        <View style={[styles.gridCell, styles.timingColumn]}>
          <Text>
            {[supplement.timing, supplement.dosage]
              .filter(Boolean) // Keep this to remove empty/null values
              .join(". \n")}
          </Text>
        </View>
        {/* Brand Suggestions & Guidelines Column - UPDATED */}
        <View style={[styles.gridCell, styles.brandColumn]}>
          {/* Use the helper function to render the content */}
          {renderTextWithLinks(supplement.brandSuggestionsAndGuidelines)}
        </View>
      </View>
    ))}
  </View>
);

// Modified Day Plan Card Component
// The main difference is we're now handling each meal period separately
// to ensure proper wrapping and avoid text overlapping
const DayCard: React.FC<{ day: DayPlan }> = ({ day }) => (
  <View style={styles.dayCard}>
    <Text style={styles.dayTitle}>{day.day}</Text>

    {/* Pre-Morning */}
    {day.preMorning && (
      <View style={styles.mealRow} wrap>
        <Text style={styles.mealLabel}>Pre-Morning:</Text>
        <Text style={styles.mealValue}>{day.preMorning}</Text>
      </View>
    )}

    {/* Morning */}
    {day.morning && (
      <View style={styles.mealRow} wrap>
        <Text style={styles.mealLabel}>Morning:</Text>
        <Text style={styles.mealValue}>{day.morning}</Text>
      </View>
    )}

    {/* Mid-Morning */}
    {day.midMorning && (
      <View style={styles.mealRow} wrap>
        <Text style={styles.mealLabel}>Mid-Morning:</Text>
        <Text style={styles.mealValue}>{day.midMorning}</Text>
      </View>
    )}

    {/* Lunch */}
    {day.lunch && (
      <View style={styles.mealRow} wrap>
        <Text style={styles.mealLabel}>Lunch:</Text>
        <Text style={styles.mealValue}>{day.lunch}</Text>
      </View>
    )}

    {/* Early Evening */}
    {day.earlyEvening && (
      <View style={styles.mealRow} wrap>
        <Text style={styles.mealLabel}>Early Evening:</Text>
        <Text style={styles.mealValue}>{day.earlyEvening}</Text>
      </View>
    )}

    {/* Night */}
    {day.night && (
      <View style={styles.mealRow} wrap>
        <Text style={styles.mealLabel}>Night:</Text>
        <Text style={styles.mealValue}>{day.night}</Text>
      </View>
    )}

    {/* Bedtime */}
    {day.bedtime && (
      <View style={styles.mealRow} wrap>
        <Text style={styles.mealLabel}>Bedtime:</Text>
        <Text style={styles.mealValue}>{day.bedtime}</Text>
      </View>
    )}
  </View>
);

const Watermark: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <View style={styles.watermarkContainer} fixed>
    <Image src={imageUrl} style={styles.watermarkImage} />
  </View>
);

// Main PDF Document Component
const PDFDocument: React.FC<SNDPDFInput> = ({
  plan,
  clientInfo,
  whiteLabelConfig,
  signOffData,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          {/* Logo Section - Now appears first */}
          <View style={styles.headerLogo}>
            {(whiteLabelConfig?.enabled ||
              whiteLabelConfig?.useParentWhiteLabels) &&
              (whiteLabelConfig.type === "TEXT" ? (
                <Text style={styles.whiteLabelText}>
                  {whiteLabelConfig.text}
                </Text>
              ) : whiteLabelConfig.type === "LOGO" &&
                whiteLabelConfig.logoUrl ? (
                <Image
                  src={whiteLabelConfig.logoUrl}
                  style={styles.logoImage}
                />
              ) : (
                <Image src="/mendrx_pdf_logo.png" style={styles.logoImage} />
              ))}
            {!whiteLabelConfig?.enabled &&
              !whiteLabelConfig?.useParentWhiteLabels && (
                <Image src="/mendrx_pdf_logo.png" style={styles.logoImage} />
              )}
          </View>
          <Text style={styles.title}>
            {plan.supplementsEnabled && plan.dietPlanEnabled
              ? "Supplements & Diet Plan"
              : plan.supplementsEnabled
              ? "Supplements Plan"
              : plan.dietPlanEnabled
              ? "Diet Plan"
              : "No Plan Available"}
          </Text>
        </View>

        {/* Client Information */}
        <View style={styles.clientInfoBox}>
          <View style={styles.clientInfoGrid}>
            <View style={styles.clientInfoColumn}>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Client Name:</Text>
                <Text style={styles.value}>{clientInfo.clientName}</Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>
                  {formatGender(clientInfo.gender)}
                </Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Age:</Text>
                <Text style={styles.value}>{clientInfo.age}</Text>
              </View>
              {clientInfo.height && clientInfo.weight && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>BMI:</Text>
                  <Text style={styles.value}>{clientInfo.bmi}</Text>
                </View>
              )}
            </View>

            {/* Right Column */}
            <View style={styles.clientInfoColumn}>
              {clientInfo.height && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Height:</Text>
                  <Text style={styles.value}>{clientInfo.height} cm</Text>
                </View>
              )}
              {clientInfo.weight && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Weight:</Text>
                  <Text style={styles.value}>{clientInfo.weight} kg</Text>
                </View>
              )}
              {clientInfo.waist && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Waist:</Text>
                  <Text style={styles.value}>{clientInfo.waist} in</Text>
                </View>
              )}
              {clientInfo.diet && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Diet:</Text>
                  <Text style={styles.value}>
                    {formatDiet(clientInfo.diet)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {clientInfo.lifestyleHabits &&
            clientInfo.lifestyleHabits.length > 0 && (
              <View style={[styles.clientInfoRow, { marginTop: 8 }]}>
                <Text style={styles.label}>Lifestyle Habits:</Text>
                <Text style={[styles.value, { flex: 1 }]}>
                  {clientInfo.lifestyleHabits
                    .map((habit: string) => formatEnumValue(habit))
                    .join(", ")}
                </Text>
              </View>
            )}

          {clientInfo.existingConditions &&
            clientInfo.existingConditions.length > 0 && (
              <View style={[styles.clientInfoRow, { marginTop: 4 }]}>
                <Text style={styles.label}>Known Conditions:</Text>
                <Text style={[styles.value, { flex: 1 }]}>
                  {clientInfo.existingConditions
                    .map((condition: string) =>
                      formatEnumValue(condition, { preserveSlashes: true })
                    )
                    .join(", ")}
                </Text>
              </View>
            )}
        </View>
        {/* Supplements Section */}
        {plan.supplementsEnabled && (
          <>
            <Text style={styles.sectionTitle}>Supplements</Text>
            <View style={styles.section} wrap={true}>
              {Object.entries(groupSupplementsByTiming(plan.supplements))
                .filter(([_, supplements]) => supplements.length > 0)
                .map(([category, supplements]) => (
                  <View
                    key={category}
                    style={styles.timingCategoryContainer}
                    wrap={true}
                  >
                    <Text style={styles.timingCategoryTitle}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <SupplementGrid supplements={supplements} />
                  </View>
                ))}
              {plan.supplementNotes && (
                <View style={styles.notes}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Supplement Notes:
                  </Text>
                  <Text>{plan.supplementNotes}</Text>
                </View>
              )}
            </View>
          </>
        )}
        {/* Diet Plan Section */}
        {plan.dietPlanEnabled && (
          <>
            {/* Only use 'break' attribute when supplements are also enabled */}
            {plan.supplementsEnabled ? (
              <Text style={styles.sectionTitle} break>
                Diet Plan
              </Text>
            ) : (
              <Text style={styles.sectionTitle}>Diet Plan</Text>
            )}
            <View style={styles.section} wrap={true}>
              {/* Modified diet plan rendering to handle page breaks better */}
              {plan.dietPlan.map((day, index) => (
                <React.Fragment key={index}>
                  {/* Each day container has wrap=true to allow content to flow across pages */}
                  <View wrap={true}>
                    <DayCard day={day} />
                  </View>
                </React.Fragment>
              ))}

              {plan.dietNotes && (
                <View style={styles.notes} wrap={true}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    Diet Notes:
                  </Text>
                  <Text>{plan.dietNotes}</Text>
                </View>
              )}
            </View>
          </>
        )}
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
                : null}
            </Text>
            <Text style={styles.signatureDesignation}>
              {(whiteLabelConfig?.enabled ||
                whiteLabelConfig?.useParentWhiteLabels) &&
              whiteLabelConfig.signoffDesignation
                ? whiteLabelConfig.signoffDesignation
                : null}
            </Text>
            <Text style={styles.signatureDate}>
              {new Date().toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
        <View style={styles.disclaimer}>
          <Text>
            {(whiteLabelConfig?.enabled ||
              whiteLabelConfig?.useParentWhiteLabels) &&
            whiteLabelConfig.customDisclaimer
              ? whiteLabelConfig.customDisclaimer
              : DEFAULT_DISCLAIMER}
          </Text>
        </View>
        {whiteLabelConfig?.useParentWhiteLabels &&
          whiteLabelConfig?.watermarkUrl && (
            <Watermark imageUrl={whiteLabelConfig.watermarkUrl} />
          )}
      </Page>
    </Document>
  );
};

export const generateSNDPDF = async (input: SNDPDFInput): Promise<string> => {
  let signOffData: SignOffData | undefined;
  const fetchSignOffData = async (
    session: any
  ): Promise<SignOffData | undefined> => {
    try {
      const signatureResponse = await fetch(`${getApiUrl()}/custom-signature`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const signatureResult = await signatureResponse.json();
      if (signatureResult.success && signatureResult.data) {
        return signatureResult.data;
      }
    } catch (error) {
      console.error("Error fetching signature data:", error);
    }
    return undefined;
  };
  try {
    const authClient = createAuthClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (session) {
      // Fetch signature data
      signOffData = await fetchSignOffData(session);

      // Fetch custom disclaimer if needed
      if (
        (input.whiteLabelConfig?.enabled ||
          input.whiteLabelConfig?.useParentWhiteLabels) &&
        !input.whiteLabelConfig.customDisclaimer
      ) {
        const response = await fetch(`${getApiUrl()}/user/disclaimer`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const result = await response.json();
        if (result.success && result.data?.customDisclaimer) {
          input.whiteLabelConfig.customDisclaimer =
            result.data.customDisclaimer;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <PDFDocument {...input} signOffData={signOffData} />
  ).toBlob();
  return URL.createObjectURL(blob);
};
