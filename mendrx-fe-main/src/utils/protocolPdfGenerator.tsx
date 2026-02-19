// src/utils/protocolPdfGenerator.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
  Svg,
  Circle,
  Path,
  Line,
  Rect,
} from "@react-pdf/renderer";
import { ClientInfo } from "@/types/client-info";
import { formatGender, formatDiet, formatEnumValue } from "./formatters";
import { createAuthClient } from "@/lib/supabase-auth";
import { getApiUrl } from "@/utils/api";
import { DEFAULT_DISCLAIMER } from "@/constants/disclaimers";
import { calculateAgeAsOnReportDate } from "./dateUtils";
import { ProtocolData, ProtocolOptions } from "@/lib/protocolDataFetchers";

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

interface BloodMarker {
  parameterName: string;
  value: string;
  units: string;
  result: "OPTIMAL" | "HIGH" | "LOW";
  deviation: number;
  reason: string;
  parameterInfo: {
    shortDescription: string;
    minValue: number;
    maxValue: number;
    standardMinValue: number;
    standardMaxValue: number;
    floorRange: number;
    ceilRange: number;
    panelName: string;
  };
}

interface BloodPanelMap {
  [key: string]: BloodMarker[];
}

interface RangeScaleChartPDFProps {
  value: number;
  units: string;
  minValue: number; // Functional (optimal) min
  maxValue: number; // Functional (optimal) max
  standardMinValue: number;
  standardMaxValue: number;
}

interface GaugeChartProps {
  deviation: number;
  result: "OPTIMAL" | "HIGH" | "LOW";
  minValue: number;
  maxValue: number;
  units?: string;
}

const MICRO = "\u00B5";

interface ProtocolPDFInput {
  protocolData: ProtocolData;
  options: ProtocolOptions;
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
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 30,
  },
  headerLogo: {
    marginBottom: 15,
    alignSelf: "flex-end",
  },
  logoImage: {
    maxWidth: 300,
    maxHeight: 150,
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
    border: "1pt solid #E5E7EB",
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
    justifyContent: "center",
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
    color: "#3B82F6",
    textDecoration: "underline",
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  baseText: {
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  baseTextInline: {
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  disclaimer: {
    paddingTop: 40,
    fontSize: 10,
    fontWeight: "bold",
    color: "#6B7280",
    textAlign: "justify",
    lineHeight: 1.4,
  },
  nameCol: {
    width: "23%",
    flexShrink: 0,
    paddingRight: 12,
  },
  valueCol: {
    width: "17%",
    flexShrink: 0,
    paddingRight: 12,
    marginLeft: -10,
  },
  gaugeCol: {
    width: "22%",
    flexShrink: 0,
    alignItems: "center",
    paddingRight: 8,
    paddingLeft: 18,
  },
  reasonsCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  parameterName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#111827",
  },
  parameterValue: {
    fontSize: 10,
    color: "#111827",
    fontWeight: 500,
  },
  parameterUnits: {
    fontSize: 10,
    color: "#6B7280",
    marginLeft: 2,
  },
  reasonsBox: {
    width: "100%",
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
  },
  reasonsTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
    color: "#374151",
  },
  reasonsList: {
    fontSize: 8,
    color: "#6B7280",
    lineHeight: 1.3,
  },
  parameterSection: {
    padding: 12,
    borderBottom: "1pt solid #E5E7EB",
    gap: 12,
  },
  parameterNameCol: {
    width: "23%",
    marginBottom: 8,
  },
  parameterDescription: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  parameterValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginLeft: 18,
  },
  parameterContainer: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  optimalParamsSection: {
    padding: 15,
  },
  optimalParamsTable: {
    borderTop: "1pt solid #E5E7EB",
  },
  optimalParamsHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottom: "1pt solid #E5E7EB",
    padding: "8 12",
  },
  optimalParamsHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    color: "#374151",
  },
  optimalParamsRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #E5E7EB",
    padding: "6 12",
  },
  optimalParamsCell: {
    fontSize: 9,
    color: "#374151",
  },
  howToReadTitle: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
    color: "#111827",
    flex: 1,
    marginBottom: 22,
  },
  howToReadSection: {
    padding: 16,
  },
  subsectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 8,
  },
  subsectionText: {
    fontSize: 12,
    lineHeight: 1.2,
  },
  boldText: {
    fontWeight: 700,
    fontFamily: "Helvetica-Bold",
  },
  image: {
    marginTop: 18,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginVertical: 20,
    width: "100%",
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
  // RCA specific
  panelCard: {
    marginBottom: 20,
    border: "1pt solid #E5E7EB",
    borderRadius: 4,
    backgroundColor: "white",
  },
  parameterLeft: {
    width: "25%",
  },
  parameterMiddle: {
    width: "20%",
  },
  parameterRight: {
    width: "55%",
    flexDirection: "column",
  },
  valueUnits: {
    fontSize: 9,
    color: "#6B7280",
  },
  optimalParamsTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    color: "#111827",
  },
  panelHeader: {
    padding: 12,
    borderBottom: "1pt solid #E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  panelHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#111827",
    flexDirection: "row",
  },
  panelMetrics: {
    flexDirection: "row",
    gap: 20,
  },
  panelStatus: {
    marginLeft: 4,
    fontWeight: 700,
  },
  metric: {
    fontSize: 9,
    color: "#6B7280",
  },
  pageNumber: {
    position: "absolute",
    fontSize: 8,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "grey",
  },
  // Lifestyle recommendation specific
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 15,
    borderCollapse: "collapse",
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
    lineHeight: 1.4,
  },
  noBorderRight: {
    borderRightWidth: 0,
  },
  sectionContent: {
    marginBottom: 20,
  },
  notesMainHeading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333", // Adjust as needed
  },
  notesHeader: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 1.3,
  },
  notesBold: {
    fontWeight: 700,
    fontFamily: "Helvetica-Bold",
  },
  notesBullet: {
    marginLeft: 12,
    marginBottom: 6,
  },
  notesBulletNested: {
    marginLeft: 24, // nested bullets (two spaces == depth 1)
    marginBottom: 2,
  },
  notesParagraph: {
    marginBottom: 8,
  },
});

const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const renderTextWithLinks = (text: string | null | undefined) => {
  if (!text) return <Text style={styles.baseTextInline}></Text>;
  const parts = text.split(urlRegex);

  return (
    <Text style={styles.baseTextInline}>
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.match(urlRegex)) {
          const linkHref = part.startsWith("www.") ? `https://${part}` : part;
          return (
            <Link key={index} src={linkHref}>
              <Text style={styles.urlText}>{part}</Text>
            </Link>
          );
        } else {
          return <Text key={index}>{part}</Text>;
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

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case "GOOD":
      return "#4CAF50";
    case "FAIR":
      return "#FFA726";
    case "POOR":
      return "#F06262";
    default:
      return "#666";
  }
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
              .filter(Boolean)
              .join(". \n")}
          </Text>
        </View>
        {/* Brand Suggestions & Guidelines Column */}
        <View style={[styles.gridCell, styles.brandColumn]}>
          {renderTextWithLinks(supplement.brandSuggestionsAndGuidelines)}
        </View>
      </View>
    ))}
  </View>
);

const DayCard: React.FC<{ day: DayPlan }> = ({ day }) => (
  <View style={styles.dayCard}>
    <Text style={styles.dayTitle}>{day.day}</Text>

    {/* Pre-Morning */}
    {day.preMorning && (
      <View style={styles.mealRow}>
        <Text style={styles.mealLabel}>Pre-Morning:</Text>
        <Text style={styles.mealValue}>{day.preMorning}</Text>
      </View>
    )}

    {/* Morning */}
    {day.morning && (
      <View style={styles.mealRow}>
        <Text style={styles.mealLabel}>Morning:</Text>
        <Text style={styles.mealValue}>{day.morning}</Text>
      </View>
    )}

    {/* Mid-Morning */}
    {day.midMorning && (
      <View style={styles.mealRow}>
        <Text style={styles.mealLabel}>Mid-Morning:</Text>
        <Text style={styles.mealValue}>{day.midMorning}</Text>
      </View>
    )}

    {/* Lunch */}
    {day.lunch && (
      <View style={styles.mealRow}>
        <Text style={styles.mealLabel}>Lunch:</Text>
        <Text style={styles.mealValue}>{day.lunch}</Text>
      </View>
    )}

    {/* Early Evening */}
    {day.earlyEvening && (
      <View style={styles.mealRow}>
        <Text style={styles.mealLabel}>Early Evening:</Text>
        <Text style={styles.mealValue}>{day.earlyEvening}</Text>
      </View>
    )}

    {/* Night */}
    {day.night && (
      <View style={styles.mealRow}>
        <Text style={styles.mealLabel}>Night:</Text>
        <Text style={styles.mealValue}>{day.night}</Text>
      </View>
    )}

    {/* Bedtime */}
    {day.bedtime && (
      <View style={styles.mealRow}>
        <Text style={styles.mealLabel}>Bedtime:</Text>
        <Text style={styles.mealValue}>{day.bedtime}</Text>
      </View>
    )}
  </View>
);

// Function to render lifestyle recommendations table
const renderLifestyleRecommendationsTable = (
  panel: any,
  panelIndex: number
) => {
  const columnSet = new Set<string>();
  panel.items.forEach((item: any) => {
    Object.keys(item).forEach((key) => columnSet.add(key));
  });
  const columns = Array.from(columnSet).sort();
  const numColumns = columns.length;
  const columnWidth = numColumns > 0 ? `${100 / numColumns}%` : "100%";

  return (
    <View style={{ marginBottom: 15 }} wrap={false}>
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
        {panel.items.map((item: any, itemIndex: number) => (
          <View
            key={`item-${itemIndex}`}
            style={
              itemIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlternate
            }
            wrap={false}
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

const renderMarkdownContent = (content: string): React.ReactNode[] => {
  if (!content) return [];
  content = content.replace(/μ/g, MICRO);
  const sections: React.ReactNode[] = [];

  // Split content into paragraphs separated by **two** new-lines
  const paragraphs = content.split("\n\n");

  paragraphs.forEach((paragraph, pIndex) => {
    if (!paragraph.trim()) return;

    const trimmedParagraph = paragraph.trim();

    /* ──────────────
     *  BLOCK-LEVEL HEADINGS
     * ────────────── */

    // ## Main heading
    if (trimmedParagraph.startsWith("## ")) {
      const headingText = trimmedParagraph.replace(/^##\s*/, "");
      sections.push(
        <Text key={`main-heading-${pIndex}`} style={styles.notesMainHeading}>
          {headingText}
        </Text>
      );
      return;
    }

    // **Header** (bold line)
    if (
      trimmedParagraph.startsWith("**") &&
      trimmedParagraph.endsWith("**") &&
      trimmedParagraph.length > 4
    ) {
      const headerText = trimmedParagraph.replace(/^\*\*|\*\*$/g, "");
      sections.push(
        <Text key={`header-${pIndex}`} style={styles.notesHeader}>
          {headerText}
        </Text>
      );
      return;
    }

    /* ──────────────
     *  INLINE / LIST PROCESSING
     * ────────────── */
    const lines = paragraph.split("\n");
    const paragraphContent: React.ReactNode[] = [];

    lines.forEach((line, lIndex) => {
      if (!line.trim()) return;

      const bulletMatch = /^(\s*)([*•])\s+(.*)/.exec(line);
      if (bulletMatch) {
        /*  bulletMatch[1] → leading spaces
            bulletMatch[2] → the bullet symbol (* or •)
            bulletMatch[3] → text after the bullet
        */
        const indentSpaces = bulletMatch[1].length;
        const textAfterBullet = bulletMatch[3];

        // depth 0 = top level, depth 1 = one level nested, etc.
        const depth = Math.floor(indentSpaces / 2);

        const parts: React.ReactNode[] = [];
        let lastIdx = 0;
        const boldRegex = /\*\*(.*?)\*\*/g;
        let m: RegExpExecArray | null;

        while ((m = boldRegex.exec(textAfterBullet)) !== null) {
          if (m.index > lastIdx) {
            parts.push(
              <Text key={`normal-${lastIdx}`}>
                {textAfterBullet.substring(lastIdx, m.index)}
              </Text>
            );
          }
          parts.push(
            <Text key={`bold-${m.index}`} style={styles.notesBold}>
              {m[1]}
            </Text>
          );
          lastIdx = m.index + m[0].length;
        }

        if (lastIdx < textAfterBullet.length) {
          parts.push(
            <Text key={`normal-end`}>{textAfterBullet.substring(lastIdx)}</Text>
          );
        }

        paragraphContent.push(
          <Text
            key={`bullet-${lIndex}`}
            style={[
              styles.notesText,
              depth === 0 ? styles.notesBullet : styles.notesBulletNested,
            ]}
          >
            {/* Keep the same bullet symbol. If you prefer ◦ / ▪ for nested
                levels, replace bulletMatch[2] or look at `depth` */}
            {bulletMatch[2]} {parts}
          </Text>
        );
        return;
      }

      /* ──────────────
       *  PLAIN TEXT (WITH OPTIONAL BOLD)
       * ────────────── */
      if (line.includes("**")) {
        const parts: React.ReactNode[] = [];
        let lastIdx = 0;
        const boldRegex = /\*\*(.*?)\*\*/g;
        let m: RegExpExecArray | null;

        while ((m = boldRegex.exec(line)) !== null) {
          if (m.index > lastIdx) {
            parts.push(
              <Text key={`normal-${lastIdx}`}>
                {line.substring(lastIdx, m.index)}
              </Text>
            );
          }
          parts.push(
            <Text key={`bold-${m.index}`} style={styles.notesBold}>
              {m[1]}
            </Text>
          );
          lastIdx = m.index + m[0].length;
        }
        if (lastIdx < line.length) {
          parts.push(<Text key={`normal-end`}>{line.substring(lastIdx)}</Text>);
        }

        paragraphContent.push(
          <Text key={`line-${lIndex}`} style={styles.notesText}>
            {parts}
          </Text>
        );
      } else {
        paragraphContent.push(
          <Text key={`line-${lIndex}`} style={styles.notesText}>
            {line.trim()}
          </Text>
        );
      }
    });

    if (paragraphContent.length) {
      sections.push(
        <View key={`para-${pIndex}`} style={{ marginBottom: 8 }}>
          {paragraphContent}
        </View>
      );
    }
  });

  return sections;
};

const GaugeChart: React.FC<GaugeChartProps> = ({
  deviation,
  result,
  minValue,
  maxValue,
}) => {
  const centerX = 60;
  const centerY = 60;
  const radius = 35;
  const strokeWidth = 3;
  const gaugeThickness = 10;
  const clampedDeviation = Math.min(Math.abs(deviation), 100);

  const calculateNeedleAngle = (): number => {
    switch (result) {
      case "OPTIMAL":
        return 0;
      case "HIGH": {
        const baseAngle = 30;
        if (clampedDeviation === 0) return baseAngle;
        return baseAngle + (clampedDeviation / 100) * 60;
      }
      case "LOW": {
        const baseAngle = -30;
        if (clampedDeviation === 0) return baseAngle;
        return baseAngle - (clampedDeviation / 100) * 60;
      }
      default:
        return 0;
    }
  };

  const formatValue = (value: number) => {
    if (value === 0) return "0"; // Special case for zero
    if (Math.abs(value) < 0.01) return value.toExponential(1);
    if (Math.abs(value) >= 1000) return value.toExponential(1);
    return value.toFixed(1);
  };

  const angle = calculateNeedleAngle();
  const needleLength = 27; // Increased needle length
  const radians = (angle * Math.PI) / 180;
  const needleEndX = centerX + Math.sin(radians) * needleLength;
  const needleEndY = centerY - Math.cos(radians) * needleLength;

  const getBorderlineText = () => {
    if (deviation === 0) {
      if (result === "HIGH") return "Borderline High";
      if (result === "LOW") return "Borderline Low";
    } else {
      if (result === "HIGH") return "High";
      if (result === "LOW") return "Low";
    }
    return null;
  };

  return (
    <Svg width={120} height={90}>
      {/* Low section (yellow) */}
      <Path
        d={`M${centerX - radius} ${centerY} A${radius} ${radius} 0 0 1 ${
          centerX - radius / 2
        } ${centerY - radius * 0.866}`}
        stroke="#FFD700"
        strokeWidth={gaugeThickness}
        fill="none"
      />

      {/* Optimal section (green) */}
      <Path
        d={`M${centerX - radius / 2} ${
          centerY - radius * 0.866
        } A${radius} ${radius} 0 0 1 ${centerX + radius / 2} ${
          centerY - radius * 0.866
        }`}
        stroke="#90EE90"
        strokeWidth={gaugeThickness}
        fill="none"
      />

      {/* High section (red) */}
      <Path
        d={`M${centerX + radius / 2} ${
          centerY - radius * 0.866
        } A${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
        stroke="#FF6347"
        strokeWidth={gaugeThickness}
        fill="none"
      />

      {/* Needle */}
      <Line
        x1={centerX}
        y1={centerY}
        x2={needleEndX}
        y2={needleEndY}
        stroke={result === "OPTIMAL" ? "#4CAF50" : "#f44336"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Center point */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={4}
        fill={result === "OPTIMAL" ? "#4CAF50" : "#f44336"}
      />
      <Circle cx={centerX} cy={centerY} r={2} fill="white" />

      {/* Labels */}
      <Text
        x={centerX - radius - 7}
        y={centerY - 17}
        style={{ fontSize: 8, fontWeight: "bold" }}
      >
        L
      </Text>
      <Text
        x={centerX - 4}
        y={centerY - radius - 6}
        style={{ fontSize: 8, fontWeight: "bold" }}
      >
        O
      </Text>
      <Text
        x={centerX + radius + 2}
        y={centerY - 17}
        style={{ fontSize: 8, fontWeight: "bold" }}
      >
        H
      </Text>

      {/* Deviation text */}
      <Text
        x={centerX}
        y={centerY + 15}
        style={{ fontSize: 9, textAnchor: "middle" }}
      >
        {`Deviation: ${deviation}%`}
      </Text>
      {getBorderlineText() && (
        <Text
          x={centerX}
          y={centerY + 26}
          textAnchor="middle"
          fill="#CA8A04"
          style={{ fontSize: 8 }}
        >
          {getBorderlineText()}
        </Text>
      )}
      <Text
        x={centerX - radius * 0.82}
        y={centerY - radius * 1.05}
        fill="#6B7280"
        style={{ fontSize: 7 }}
      >
        {formatValue(minValue)}
      </Text>
      <Text
        x={centerX + radius * 0.45}
        y={centerY - radius * 1.05}
        fill="#6B7280"
        style={{ fontSize: 7 }}
      >
        {formatValue(maxValue)}
      </Text>
    </Svg>
  );
};

const RangeScaleChartPDF: React.FC<RangeScaleChartPDFProps> = ({
  value,
  units,
  minValue,
  maxValue,
  standardMinValue,
  standardMaxValue,
}) => {
  // Calculate scale min and max with padding, mirroring UI logic
  const allPoints = [
    value,
    minValue,
    maxValue,
    standardMinValue,
    standardMaxValue,
  ];
  let scaleMin = Math.min(...allPoints);
  let scaleMax = Math.max(...allPoints);
  if (scaleMin === scaleMax) {
    scaleMin -= Math.abs(scaleMin * 0.1) || 1;
    scaleMax += Math.abs(scaleMax * 0.1) || 1;
  }
  const coreRange = scaleMax - scaleMin;
  const padding = coreRange * 0.15;
  scaleMin -= padding;
  scaleMax += padding;

  // Function to map values to SVG x-coordinates (5 to 145, bar length 140)
  const getPosition = (val: number): number => {
    const normalized = (val - scaleMin) / (scaleMax - scaleMin);
    const position = 5 + normalized * 90; // Bar from 5 to 115
    return Math.max(5, Math.min(115, position));
  };

  // Calculate positions
  const valuePos = getPosition(value);
  const stdMinPos = getPosition(standardMinValue);
  const stdMaxPos = getPosition(standardMaxValue);
  const funcMinPos = getPosition(minValue);
  const funcMaxPos = getPosition(maxValue);

  // Determine marker color based on UI logic
  let markerColor = "#DC2626"; // red-600 (default: outside ranges or borderline standard)
  if (value > minValue && value < maxValue) {
    markerColor = "#059669"; // green-600 (strictly inside optimal)
  } else if (value === minValue || value === maxValue) {
    markerColor = "#F59E0B"; // amber-500 (borderline optimal)
  } else if (value > standardMinValue && value < standardMaxValue) {
    markerColor = "#B45309"; // amber-700 (inside standard, outside optimal)
  } else if (value === standardMinValue || value === standardMaxValue) {
    markerColor = "#DC2626"; // red-600 (borderline standard)
  }

  // Format values for labels, matching UI's formatAxisValue
  const formatAxisValue = (val: number): string => {
    if (val === 0) return "0";
    if (Math.abs(val) < 1 && Math.abs(val) > 0) return val.toFixed(1);
    if (Math.abs(val) >= 1000) return val.toExponential(0);
    return val.toFixed(Number.isInteger(val) ? 0 : 1);
  };

  return (
    <Svg width={100} height={50}>
      {/* Background bar */}
      <Rect x={5} y={15} width={90} height={6} fill="#F3F4F6" />
      {/* Standard range bar */}
      <Rect
        x={stdMinPos}
        y={15}
        width={stdMaxPos - stdMinPos}
        height={6}
        fill="#FCD34D" // amber-300
      />
      {/* Optimal range bar */}
      <Rect
        x={funcMinPos}
        y={15}
        width={funcMaxPos - funcMinPos}
        height={6}
        fill="#86EFAC" // green-300
        stroke="#4ADE80" // green-400
        strokeWidth={1}
      />
      {/* Patient value marker */}
      <Circle cx={valuePos} cy={18} r={2} fill={markerColor} />

      {/* Standard min label */}
      <Text
        x={stdMinPos}
        y={28}
        textAnchor="middle"
        style={{ fontSize: 6, fill: "#F59E0B" }} // Changed from gray-500 to amber-500
      >
        {formatAxisValue(standardMinValue)}
      </Text>
      {/* Standard max label */}
      <Text
        x={stdMaxPos}
        y={28}
        textAnchor="middle"
        style={{ fontSize: 6, fill: "#F59E0B" }} // Changed from gray-500 to amber-500
      >
        {formatAxisValue(standardMaxValue)}
      </Text>
      {/* Optimal min label - moved closer to bar */}
      <Text
        x={funcMinPos}
        y={12}
        textAnchor="middle"
        style={{ fontSize: 6, fill: "#166534" }} // green-800
      >
        {formatAxisValue(minValue)}
      </Text>
      {/* Optimal max label - moved closer to bar */}
      <Text
        x={funcMaxPos}
        y={12}
        textAnchor="middle"
        style={{ fontSize: 6, fill: "#166534" }}
      >
        {formatAxisValue(maxValue)}
      </Text>
      {/* Legend: Standard */}
      <Rect x={10} y={40} width={8} height={4} fill="#FCD34D" />
      <Text
        x={20}
        y={44}
        style={{ fontSize: 6, fill: "#374151" }} // gray-700
      >
        Standard
      </Text>
      {/* Legend: Optimal */}
      <Rect
        x={60}
        y={40}
        width={8}
        height={4}
        fill="#86EFAC"
        stroke="#4ADE80"
        strokeWidth={1}
      />
      <Text x={70} y={44} style={{ fontSize: 6, fill: "#374151" }}>
        Optimal
      </Text>
    </Svg>
  );
};

const Watermark: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <View style={styles.watermarkContainer} fixed>
    <Image src={imageUrl} style={styles.watermarkImage} />
  </View>
);

// Main PDF Document Component
const ProtocolPDFDocument: React.FC<ProtocolPDFInput> = ({
  protocolData,
  options,
  whiteLabelConfig,
  signOffData,
}) => {
  // Extract client info from RCA data
  const clientInfo = protocolData.rootCauseAnalysis
    ? {
        clientName: protocolData.rootCauseAnalysis.client.name,
        gender: protocolData.rootCauseAnalysis.client.gender,
        age: calculateAgeAsOnReportDate(
          protocolData.rootCauseAnalysis.client.birthMonth,
          protocolData.rootCauseAnalysis.reportDate
        ),
        height: protocolData.rootCauseAnalysis.height,
        weight: protocolData.rootCauseAnalysis.weight,
        waist: protocolData.rootCauseAnalysis.waist,
        diet: protocolData.rootCauseAnalysis.diet,
        bmi: protocolData.rootCauseAnalysis.bmi,
        lifestyleHabits: protocolData.rootCauseAnalysis.lifestyleHabits || [],
        existingConditions:
          protocolData.rootCauseAnalysis.existingConditions || [],
      }
    : null;

  // Count active sections
  const sectionCount =
    (options.includeRCASummary ? 1 : 0) +
    (options.includeRCABreakdown ? 1 : 0) +
    (options.includeSupplements ? 1 : 0) +
    (options.includeDietPlan ? 1 : 0) +
    (options.includeLifestyleRec ? 1 : 0);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          {/* Logo Section */}
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
          <Text style={styles.title}>Health Protocol</Text>
        </View>

        {/* Client Information */}
        {clientInfo && (
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
                {clientInfo.bmi && (
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
        )}

        {/* Disclaimer Section - Moved here to appear after client info */}
        <View style={styles.disclaimer}>
          <Text>
            {(whiteLabelConfig?.enabled ||
              whiteLabelConfig?.useParentWhiteLabels) &&
            whiteLabelConfig.customDisclaimer
              ? whiteLabelConfig.customDisclaimer
              : DEFAULT_DISCLAIMER}
          </Text>
        </View>
        <View break />

        {/* How to Read Section */}
        <View style={styles.howToReadSection}>
          <Text style={styles.howToReadTitle}>
            How to Read Your Functional Medicine Blood Report
          </Text>

          {/* Track section number */}
          {(() => {
            let sectionNumber = 1;
            return (
              <>
                {/* Section 1 - Only show if RCA Summary is included */}
                {options.includeRCASummary && (
                  <>
                    <Text style={styles.subsectionTitle}>
                      {sectionNumber++}. Your Health Summary at a Glance
                    </Text>
                    <Text style={styles.subsectionText}>
                      At the very top of your report, you'll see a summary of{" "}
                      <Text style={styles.boldText}>
                        potential health concerns
                      </Text>
                      . These are based on patterns we've identified by looking
                      at your <Text style={styles.boldText}>blood markers</Text>{" "}
                      through a{" "}
                      <Text style={styles.boldText}>
                        functional medicine lens
                      </Text>
                      —a holistic approach that focuses on finding the{" "}
                      <Text style={styles.boldText}>root cause</Text> of
                      symptoms before they become illness.
                    </Text>
                  </>
                )}

                {/* Section 2 - Only show if RCA Breakdown is included */}
                {options.includeRCABreakdown && (
                  <>
                    <Text style={styles.subsectionTitle}>
                      {sectionNumber++}. Understanding Your Blood Markers
                    </Text>
                    <Text style={styles.subsectionText}>
                      Your report includes a list of all the{" "}
                      <Text style={styles.boldText}>blood markers</Text>{" "}
                      uploaded from your lab blood report.
                    </Text>
                    <Image src="/how_to_read_pdf.png" style={styles.image} />
                  </>
                )}

                {/* Additional sections based on selected options */}
                {(options.includeSupplements ||
                  options.includeDietPlan ||
                  options.includeLifestyleRec) && (
                  <>
                    <Text style={styles.subsectionTitle}>
                      {sectionNumber}.{" "}
                      {(() => {
                        const selectedOptions = [];
                        if (options.includeSupplements)
                          selectedOptions.push("Supplement Recommendations");
                        if (options.includeDietPlan)
                          selectedOptions.push("Diet Plan");
                        if (options.includeLifestyleRec)
                          selectedOptions.push("Lifestyle Recommendations");

                        if (selectedOptions.length === 0)
                          return "No Recommendations Available";
                        if (selectedOptions.length === 1)
                          return selectedOptions[0];

                        // For multiple options, join with "and" for the last item
                        const lastOption = selectedOptions.pop();
                        return `${selectedOptions.join(
                          ", "
                        )} and ${lastOption}`;
                      })()}
                    </Text>
                    <Text style={styles.subsectionText}>
                      {options.includeSupplements && (
                        <>
                          Based on your blood markers, we've included{" "}
                          <Text style={styles.boldText}>
                            personalized supplement recommendations
                          </Text>{" "}
                          to help address your specific needs.
                        </>
                      )}
                      {options.includeDietPlan && (
                        <>
                          {options.includeSupplements
                            ? " We've also "
                            : "We've "}{" "}
                          included a{" "}
                          <Text style={styles.boldText}>
                            customized diet plan
                          </Text>{" "}
                          designed to support your health goals.
                        </>
                      )}
                      {options.includeLifestyleRec && (
                        <>
                          {options.includeSupplements || options.includeDietPlan
                            ? " Additionally, we've provided "
                            : "We've provided "}{" "}
                          <Text style={styles.boldText}>
                            lifestyle recommendations
                          </Text>{" "}
                          that can help optimize your overall wellbeing.
                        </>
                      )}
                    </Text>
                  </>
                )}
              </>
            );
          })()}
        </View>
        <View break />

        {(options.includeRCASummary || options.includeRCABreakdown) &&
          protocolData.rootCauseAnalysis &&
          protocolData.rootCauseAnalysis.notes && (
            <>
              <View style={styles.sectionContent}>
                <View style={{ marginTop: 20, marginBottom: 10 }}>
                  {renderMarkdownContent(protocolData.rootCauseAnalysis.notes)}
                </View>
              </View>
              {sectionCount > 1 && <View break />}
            </>
          )}

        {/* Root Cause Analysis Breakdown Section */}
        {options.includeRCABreakdown && protocolData.rootCauseAnalysis && (
          <>
            <Text style={styles.sectionTitle}>
              Root Cause Analysis Breakdown
            </Text>
            <View style={styles.sectionContent}>
              {protocolData.rootCauseAnalysis.bloodPanelListMap && (
                <>
                  {Object.entries(
                    protocolData.rootCauseAnalysis
                      .bloodPanelListMap as BloodPanelMap
                  ).map(([panelKey, markers], i, panels) => {
                    try {
                      const panel = JSON.parse(panelKey);
                      const statusColor = getStatusColor(panel.status);
                      return (
                        <View key={panel.name} break={i > 0}>
                          <View style={styles.panelCard}>
                            <View style={styles.panelHeader}>
                              <View style={styles.panelHeaderContent}>
                                <View style={styles.panelTitle}>
                                  <Text>{panel.name}: </Text>
                                  <Text
                                    style={[
                                      styles.panelStatus,
                                      { color: statusColor },
                                    ]}
                                  >
                                    {panel.status}
                                  </Text>
                                </View>
                                <Text style={styles.metric}>
                                  Health Score: {panel.healthScore}
                                </Text>
                              </View>
                            </View>

                            {/* Deviated Parameters */}
                            {markers
                              .filter((m) => m.result !== "OPTIMAL")
                              .map((marker) => {
                                const numericValue = parseFloat(marker.value);
                                const isValueNumeric = !isNaN(numericValue);
                                const hasDetails = !!marker.parameterInfo;
                                const hasStandardRange =
                                  hasDetails &&
                                  typeof marker.parameterInfo
                                    .standardMinValue === "number" &&
                                  typeof marker.parameterInfo
                                    .standardMaxValue === "number";
                                const hasFunctionalRange =
                                  hasDetails &&
                                  typeof marker.parameterInfo.minValue ===
                                    "number" &&
                                  typeof marker.parameterInfo.maxValue ===
                                    "number";
                                const canRenderRangeScale =
                                  isValueNumeric &&
                                  hasStandardRange &&
                                  hasFunctionalRange;

                                return (
                                  <View
                                    style={styles.parameterSection}
                                    key={marker.parameterName}
                                  >
                                    <View
                                      style={styles.parameterContainer}
                                      wrap={true}
                                    >
                                      {/* Column 1: Parameter Name and Description */}
                                      <View style={styles.nameCol}>
                                        <Text style={styles.parameterName}>
                                          {marker.parameterName}
                                        </Text>
                                        {marker.parameterInfo
                                          ?.shortDescription && (
                                          <Text
                                            style={styles.parameterDescription}
                                          >
                                            {
                                              marker.parameterInfo
                                                .shortDescription
                                            }
                                          </Text>
                                        )}
                                      </View>

                                      {/* Column 2: Value, Units, and Range Scale Chart */}
                                      <View style={styles.valueCol}>
                                        <View style={styles.parameterValueRow}>
                                          <Text style={styles.parameterValue}>
                                            {marker.value}
                                          </Text>
                                          <Text style={styles.parameterUnits}>
                                            {marker.units?.replace(/μ/g, MICRO)}
                                          </Text>
                                        </View>
                                        {canRenderRangeScale && (
                                          <RangeScaleChartPDF
                                            value={numericValue}
                                            units={marker.units}
                                            minValue={
                                              marker.parameterInfo.minValue
                                            }
                                            maxValue={
                                              marker.parameterInfo.maxValue
                                            }
                                            standardMinValue={
                                              marker.parameterInfo
                                                .standardMinValue
                                            }
                                            standardMaxValue={
                                              marker.parameterInfo
                                                .standardMaxValue
                                            }
                                          />
                                        )}
                                      </View>

                                      {/* Column 3: Gauge Chart */}
                                      <View style={styles.gaugeCol}>
                                        <GaugeChart
                                          deviation={marker.deviation}
                                          result={marker.result}
                                          minValue={
                                            marker.parameterInfo.minValue
                                          }
                                          maxValue={
                                            marker.parameterInfo.maxValue
                                          }
                                          units={marker.units}
                                        />
                                      </View>

                                      {/* Column 4: Possible Reasons */}
                                      <View style={styles.reasonsCol}>
                                        {marker.reason && (
                                          <View style={styles.reasonsBox}>
                                            <Text style={styles.reasonsTitle}>
                                              Possible Reasons:
                                            </Text>
                                            <Text style={styles.reasonsList}>
                                              {"\n"}
                                              {marker.reason
                                                .split(/\.\s+/)
                                                .filter((reason) =>
                                                  reason.trim()
                                                )
                                                .map((reason) => {
                                                  const cleanReason =
                                                    reason.trim();
                                                  return `• ${cleanReason}${
                                                    cleanReason.endsWith(".")
                                                      ? ""
                                                      : "."
                                                  }`;
                                                })
                                                .join("\n")}
                                            </Text>
                                          </View>
                                        )}
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}

                            {/* Optimal Parameters section */}
                            {markers.filter((m) => m.result === "OPTIMAL")
                              .length > 0 && (
                              <View style={styles.optimalParamsSection}>
                                <Text style={styles.optimalParamsTitle}>
                                  Optimal Parameters
                                </Text>
                                <View style={styles.optimalParamsTable}>
                                  {/* Table Header */}
                                  <View style={styles.optimalParamsHeader}>
                                    <Text
                                      style={[
                                        styles.optimalParamsHeaderCell,
                                        { flex: 2 },
                                      ]}
                                    >
                                      Parameter
                                    </Text>
                                    <Text
                                      style={[
                                        styles.optimalParamsHeaderCell,
                                        { flex: 1 },
                                      ]}
                                    >
                                      Value
                                    </Text>
                                    <Text
                                      style={[
                                        styles.optimalParamsHeaderCell,
                                        { flex: 1 },
                                      ]}
                                    >
                                      Units
                                    </Text>
                                  </View>

                                  {/* Table Body */}
                                  {markers
                                    .filter((m) => m.result === "OPTIMAL")
                                    .map((marker) => (
                                      <View
                                        style={styles.optimalParamsRow}
                                        key={marker.parameterName}
                                        wrap={false}
                                      >
                                        <Text
                                          style={[
                                            styles.optimalParamsCell,
                                            { flex: 2 },
                                          ]}
                                        >
                                          {marker.parameterName}
                                        </Text>
                                        <Text
                                          style={[
                                            styles.optimalParamsCell,
                                            { flex: 1 },
                                          ]}
                                        >
                                          {marker.value}
                                        </Text>
                                        <Text
                                          style={[
                                            styles.optimalParamsCell,
                                            { flex: 1 },
                                          ]}
                                        >
                                          {marker.units?.replace(/μ/g, MICRO)}
                                        </Text>
                                      </View>
                                    ))}
                                </View>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    } catch (error) {
                      console.error("Error processing panel:", error);
                      return null;
                    }
                  })}
                </>
              )}
            </View>
            {(options.includeSupplements ||
              options.includeDietPlan ||
              options.includeLifestyleRec) && <View break />}
          </>
        )}

        {/* Supplements Section */}
        {options.includeSupplements && protocolData.supplements && (
          <>
            {Object.entries(groupSupplementsByTiming(protocolData.supplements))
              .filter(([_, supplements]) => supplements.length > 0)
              .map(([category, supplements], index, filteredArray) => (
                <React.Fragment key={category}>
                  {/* Add page break before each category except the first one */}
                  {index > 0 && <View break />}

                  <Text style={styles.sectionTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}{" "}
                    Supplements
                  </Text>
                  <View style={styles.section} wrap={true}>
                    <View style={styles.timingCategoryContainer} wrap={true}>
                      <SupplementGrid supplements={supplements} />
                    </View>
                  </View>

                  {/* Add page break after the last supplement category if other sections follow */}
                  {index === filteredArray.length - 1 &&
                    (options.includeDietPlan ||
                      options.includeLifestyleRec) && <View break />}
                </React.Fragment>
              ))}
          </>
        )}

        {/* Diet Plan Section */}
        {options.includeDietPlan && protocolData.dietPlan && (
          <>
            <Text style={styles.sectionTitle}>Diet Plan</Text>
            <View style={styles.section} wrap={true}>
              {(() => {
                // Handle array of day plans directly
                if (
                  Array.isArray(protocolData.dietPlan) &&
                  protocolData.dietPlan.length > 0
                ) {
                  return protocolData.dietPlan.map(
                    (day: any, index: number) => (
                      <React.Fragment key={index}>
                        <View wrap={true}>
                          <DayCard day={day} />
                        </View>
                      </React.Fragment>
                    )
                  );
                }

                // Handle if dietPlan has a property called dayPlans which is an array
                // This handles the structure we added in protocolDataFetchers.ts
                else if (
                  protocolData.dietPlan?.dayPlans &&
                  Array.isArray(protocolData.dietPlan.dayPlans) &&
                  protocolData.dietPlan.dayPlans.length > 0
                ) {
                  return protocolData.dietPlan.dayPlans.map(
                    (day: any, index: number) => (
                      <React.Fragment key={index}>
                        <View wrap={true}>
                          <DayCard day={day} />
                        </View>
                      </React.Fragment>
                    )
                  );
                }

                // Handle if dietPlan has a property called dietPlan which is an array
                else if (
                  protocolData.dietPlan?.dietPlan &&
                  Array.isArray(protocolData.dietPlan.dietPlan) &&
                  protocolData.dietPlan.dietPlan.length > 0
                ) {
                  return protocolData.dietPlan.dietPlan.map(
                    (day: any, index: number) => (
                      <React.Fragment key={index}>
                        <View wrap={true}>
                          <DayCard day={day} />
                        </View>
                      </React.Fragment>
                    )
                  );
                }

                // If dietPlan data is in JSON string format, try to parse it
                else if (typeof protocolData.dietPlan === "string") {
                  try {
                    const parsedDietPlan = JSON.parse(protocolData.dietPlan);
                    if (
                      Array.isArray(parsedDietPlan) &&
                      parsedDietPlan.length > 0
                    ) {
                      return parsedDietPlan.map((day: any, index: number) => (
                        <DayCard key={index} day={day} />
                      ));
                    } else if (
                      parsedDietPlan.dayPlans &&
                      Array.isArray(parsedDietPlan.dayPlans)
                    ) {
                      return parsedDietPlan.dayPlans.map(
                        (day: any, index: number) => (
                          <DayCard key={index} day={day} />
                        )
                      );
                    } else if (
                      parsedDietPlan.dietPlanVersions &&
                      Array.isArray(parsedDietPlan.dietPlanVersions) &&
                      parsedDietPlan.dietPlanVersions.length > 0
                    ) {
                      const latestVersion =
                        parsedDietPlan.dietPlanVersions[
                          parsedDietPlan.dietPlanVersions.length - 1
                        ];
                      if (
                        latestVersion.dayPlans &&
                        Array.isArray(latestVersion.dayPlans)
                      ) {
                        return latestVersion.dayPlans.map(
                          (day: any, index: number) => (
                            <DayCard key={index} day={day} />
                          )
                        );
                      }
                    }
                  } catch (err) {
                    console.error("Error parsing diet plan data:", err);
                  }
                }

                return (
                  <Text>
                    No diet plan data available in the expected format.
                  </Text>
                );
              })()}
              {/* Add support for diet notes if they exist */}
              {protocolData.dietPlan?.dietNotes && (
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
                  <Text>{protocolData.dietPlan.dietNotes}</Text>
                </View>
              )}
            </View>
            {options.includeLifestyleRec && <View break />}
          </>
        )}

        {/* Lifestyle Recommendations Section */}
        {options.includeLifestyleRec &&
          protocolData.lifestyleRecommendations && (
            <>
              <Text style={styles.sectionTitle}>Lifestyle Recommendations</Text>
              <View style={styles.section}>
                {(() => {
                  // Try to handle the different possible data structures
                  if (Array.isArray(protocolData.lifestyleRecommendations)) {
                    return protocolData.lifestyleRecommendations.map(
                      (panel: any, index: number) => (
                        <React.Fragment key={index}>
                          {renderLifestyleRecommendationsTable(panel, index)}
                        </React.Fragment>
                      )
                    );
                  }

                  // Check if data is in lifestyleRecommendations.recommendations
                  else if (
                    typeof protocolData.lifestyleRecommendations === "object" &&
                    protocolData.lifestyleRecommendations.recommendations &&
                    Array.isArray(
                      protocolData.lifestyleRecommendations.recommendations
                    )
                  ) {
                    return protocolData.lifestyleRecommendations.recommendations.map(
                      (panel: any, index: number) => (
                        <React.Fragment key={index}>
                          {renderLifestyleRecommendationsTable(panel, index)}
                        </React.Fragment>
                      )
                    );
                  }

                  // Check if data is in lifestyleRecommendations.lifestyleRecommendations
                  else if (
                    typeof protocolData.lifestyleRecommendations === "object" &&
                    protocolData.lifestyleRecommendations
                      .lifestyleRecommendations &&
                    Array.isArray(
                      protocolData.lifestyleRecommendations
                        .lifestyleRecommendations
                    )
                  ) {
                    return protocolData.lifestyleRecommendations.lifestyleRecommendations.map(
                      (panel: any, index: number) => (
                        <React.Fragment key={index}>
                          {renderLifestyleRecommendationsTable(panel, index)}
                        </React.Fragment>
                      )
                    );
                  }

                  // Check if data is in recommendationData as a JSON string
                  else if (
                    typeof protocolData.lifestyleRecommendations === "object" &&
                    protocolData.lifestyleRecommendations.recommendationData
                  ) {
                    try {
                      const parsedData = JSON.parse(
                        protocolData.lifestyleRecommendations.recommendationData
                      );
                      if (Array.isArray(parsedData)) {
                        return parsedData.map((panel: any, index: number) => (
                          <React.Fragment key={index}>
                            {renderLifestyleRecommendationsTable(panel, index)}
                          </React.Fragment>
                        ));
                      }
                    } catch (err) {
                      console.error("Error parsing recommendationData:", err);
                    }
                  }

                  // NEW: Handle case where lifestyleRecommendations might be in a nested structure
                  else if (
                    typeof protocolData.lifestyleRecommendations === "object" &&
                    protocolData.lifestyleRecommendations
                      .lifestyleRecommendations &&
                    typeof protocolData.lifestyleRecommendations
                      .lifestyleRecommendations === "object" &&
                    protocolData.lifestyleRecommendations
                      .lifestyleRecommendations.recommendationData
                  ) {
                    try {
                      const parsedData = JSON.parse(
                        protocolData.lifestyleRecommendations
                          .lifestyleRecommendations.recommendationData
                      );
                      if (Array.isArray(parsedData)) {
                        return parsedData.map((panel: any, index: number) => (
                          <React.Fragment key={index}>
                            {renderLifestyleRecommendationsTable(panel, index)}
                          </React.Fragment>
                        ));
                      }
                    } catch (err) {
                      console.error(
                        "Error parsing nested recommendationData:",
                        err
                      );
                    }
                  }

                  // Fallback for no valid data structure found
                  return (
                    <Text>
                      No lifestyle recommendations data available in correct
                      format.
                    </Text>
                  );
                })()}
              </View>
            </>
          )}

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

        {whiteLabelConfig?.useParentWhiteLabels &&
          whiteLabelConfig?.watermarkUrl && (
            <Watermark imageUrl={whiteLabelConfig.watermarkUrl} />
          )}
      </Page>
    </Document>
  );
};

export const generateProtocolPDF = async (
  protocolData: ProtocolData,
  options: ProtocolOptions,
  whiteLabelConfig?: WhiteLabelConfig
): Promise<string> => {
  let signOffData: SignOffData | undefined;

  try {
    const authClient = createAuthClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (session) {
      // Fetch signature data
      const signatureResponse = await fetch(`${getApiUrl()}/custom-signature`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const signatureResult = await signatureResponse.json();
      if (signatureResult.success && signatureResult.data) {
        signOffData = signatureResult.data;
      }

      // Fetch custom disclaimer if needed
      if (
        (whiteLabelConfig?.enabled || whiteLabelConfig?.useParentWhiteLabels) &&
        !whiteLabelConfig.customDisclaimer
      ) {
        const response = await fetch(`${getApiUrl()}/user/disclaimer`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const result = await response.json();
        if (result.success && result.data?.customDisclaimer) {
          whiteLabelConfig.customDisclaimer = result.data.customDisclaimer;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <ProtocolPDFDocument
      protocolData={protocolData}
      options={options}
      whiteLabelConfig={whiteLabelConfig}
      signOffData={signOffData}
    />
  ).toBlob();

  return URL.createObjectURL(blob);
};
