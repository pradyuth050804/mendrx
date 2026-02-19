// File: src/utils/pdfGenerator.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Circle,
  Path,
  Line,
  Font,
  Image,
  Rect,
} from "@react-pdf/renderer";
import { formatGender, formatDiet, formatEnumValue } from "./formatters";
import { DEFAULT_DISCLAIMER } from "@/constants/disclaimers";
import { createAuthClient } from "@/lib/supabase-auth";
import { getApiUrl } from "@/utils/api";
import { calculateAgeAsOnReportDate } from "./dateUtils";

interface SignOffData {
  name: string;
  designation: string;
  signatureUrl?: string;
}

interface BloodMarker {
  parameterName: string;
  value: string;
  units: string;
  result: "OPTIMAL" | "HIGH" | "LOW";
  deviation: number;
  reason: string;
  parameterInfo: ParameterInfo;
}

interface ParameterInfo {
  shortDescription: string;
  minValue: number;
  maxValue: number;
  standardMinValue: number;
  standardMaxValue: number;
  floorRange: number;
  ceilRange: number;
  panelName: string;
}

interface RangeScaleChartPDFProps {
  value: number;
  units: string;
  minValue: number; // Functional (optimal) min
  maxValue: number; // Functional (optimal) max
  standardMinValue: number;
  standardMaxValue: number;
}

interface Report {
  id: string;
  client: {
    id: string;
    name: string;
    gender: string;
    birthMonth: string;
    phoneNumber: string;
    email?: string;
  };
  reportDate: string;
  height?: string;
  weight?: string;
  waist?: string;
  diet?: string;
  bmi?: string;
  lifestyleHabits?: string[];
  existingConditions?: string[];
  bloodMarkers: BloodMarker[];
  bloodPanelListMap: BloodPanelMap;
  notes: string | null;
}

interface AnalysisResult {
  report: Report;
  consumedCredits: number;
  updatedCredits: number;
}

interface GaugeChartProps {
  deviation: number;
  result: "OPTIMAL" | "HIGH" | "LOW";
  minValue: number;
  maxValue: number;
  units?: string;
}

interface BloodPanelMap {
  [key: string]: BloodMarker[];
}

interface BloodPanelPDFProps {
  bloodPanelListMap: BloodPanelMap;
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

interface PDFDocumentProps {
  result: AnalysisResult;
  whiteLabelConfig?: WhiteLabelConfig;
  signOffData?: SignOffData;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10, // Reduced base font size
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
    alignItems: "center", // This ensures vertical alignment
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
  nameCol: {
    // flexBasis: "23%",  // Use width instead of flexBasis for more direct control
    width: "23%",
    flexShrink: 0, // Prevent this column from shrinking
    paddingRight: 12, // Add spacing to the right (replaces gap)
  },
  valueCol: {
    // flexBasis: "17%",
    width: "17%",
    flexShrink: 0, // Prevent shrinking
    paddingRight: 12,
    marginLeft: -10,
  },
  gaugeCol: {
    // flexBasis: "25%",
    width: "22%",
    flexShrink: 0, // Prevent shrinking
    alignItems: "center",
    paddingRight: 8,
    paddingLeft: 18, // Add spacing to the right (replaces gap)
  },
  reasonsCol: {
    // This column will take the remaining space
    flexGrow: 1, // Allow it to grow and fill the available space
    flexShrink: 1, // Allow it to shrink if the row is too constrained
    flexBasis: 0, // Start width calculation from 0 (standard with flexGrow: 1)
    // NO explicit width: Let flexGrow determine the width based on remaining space
    // Ensure content inside this column (Text components) can wrap properly.
    // You might need specific styles or props on the Text elements for wrapping.
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
    borderRadius: 4, // Make the box fill the calculated width of reasonsCol
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
    marginBottom: 8, // Add space between name and description
  },
  parameterDescription: {
    fontSize: 9, // Increased from 8 to 9 for readability
    color: "#6B7280",
    marginTop: 2,
  },
  parameterValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginLeft: 18, // Shifts value and units right
  },
  parameterContainer: {
    flexDirection: "row",
    width: "100%", // Essential for child percentages
    gap: 8, // REMOVE gap for better predictability
    alignItems: "flex-start", // Align column tops (optional, adjust as needed)
    marginBottom: 10, // Add some space below each row if needed
  },
  leftColumn: {
    width: "23%",
  },
  middleColumn: {
    width: "17%",
  },
  rightColumns: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  gaugeContainer: {
    width: "45%",
  },
  reasonsContainer: {
    flex: 1,
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
  notesMainHeading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333", // Adjust as needed
  },

  notesSection: {
    marginTop: 16,
    padding: 16,
  },
  notesHeader: {
    fontSize: 14, // Match subsectionTitle size
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 1.2, // Match subsectionText line height
  },
  notesText: {
    fontSize: 12, // Match subsectionText size
    lineHeight: 1.3, // Match subsectionText line height
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
  whiteLabelText: {
    fontSize: 10,
    color: "#374151",
    fontFamily: "Helvetica",
    textAlign: "right",
    width: 200, // Provide enough width for certifications/longer names
    marginLeft: "auto", // Push text to right side
  },
  disclaimer: {
    paddingTop: 40,
    fontSize: 10, // Increased from 8 to 9 for prominence
    fontWeight: "bold", // Make the disclaimer bold
    color: "#6B7280",
    textAlign: "justify",
    lineHeight: 1.4,
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
    fontFamily: "Helvetica-Bold", // Applied bold font family to subtitle
    marginTop: 12,
    marginBottom: 8,
  },
  subsectionText: {
    fontSize: 12,
    lineHeight: 1.2,
  },
  boldText: {
    fontWeight: 700,
    fontFamily: "Helvetica-Bold", // Applied bold font family to specific words
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
});

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

const MICRO = "\u00B5";

const BloodPanelPDF: React.FC<BloodPanelPDFProps> = ({ bloodPanelListMap }) => {
  const panels = Object.entries(bloodPanelListMap);
  return (
    <>
      {panels.map(([panelKey, markers], i) => {
        const panel = JSON.parse(panelKey);
        const statusColor = getStatusColor(panel.status);
        return (
          <React.Fragment key={panel.name}>
            <View style={styles.panelCard} key={panel.name}>
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderContent}>
                  <View style={styles.panelTitle}>
                    <Text>{panel.name}: </Text>
                    <Text style={[styles.panelStatus, { color: statusColor }]}>
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
                    typeof marker.parameterInfo.standardMinValue === "number" &&
                    typeof marker.parameterInfo.standardMaxValue === "number";
                  const hasFunctionalRange =
                    hasDetails &&
                    typeof marker.parameterInfo.minValue === "number" &&
                    typeof marker.parameterInfo.maxValue === "number";
                  const canRenderRangeScale =
                    isValueNumeric && hasStandardRange && hasFunctionalRange;

                  return (
                    <View
                      style={styles.parameterSection}
                      key={marker.parameterName}
                    >
                      <View style={styles.parameterContainer} wrap={true}>
                        {/* Column 1: Parameter Name and Description */}
                        <View style={styles.nameCol}>
                          <Text style={styles.parameterName}>
                            {marker.parameterName}
                          </Text>
                          {marker.parameterInfo?.shortDescription && (
                            <Text style={styles.parameterDescription}>
                              {marker.parameterInfo.shortDescription}
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
                              minValue={marker.parameterInfo.minValue}
                              maxValue={marker.parameterInfo.maxValue}
                              standardMinValue={
                                marker.parameterInfo.standardMinValue
                              }
                              standardMaxValue={
                                marker.parameterInfo.standardMaxValue
                              }
                            />
                          )}
                        </View>

                        {/* Column 3: Gauge Chart */}
                        <View style={styles.gaugeCol}>
                          <GaugeChart
                            deviation={marker.deviation}
                            result={marker.result}
                            minValue={marker.parameterInfo.minValue}
                            maxValue={marker.parameterInfo.maxValue}
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
                                  .filter((reason) => reason.trim())
                                  .map((reason) => {
                                    const cleanReason = reason.trim();
                                    return `• ${cleanReason}${
                                      cleanReason.endsWith(".") ? "" : "."
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
              {markers.filter((m) => m.result === "OPTIMAL").length > 0 && (
                <View style={styles.optimalParamsSection}>
                  <Text style={styles.optimalParamsTitle}>
                    Optimal Parameters
                  </Text>
                  <View style={styles.optimalParamsTable}>
                    {/* Table Header */}
                    <View style={styles.optimalParamsHeader}>
                      <Text
                        style={[styles.optimalParamsHeaderCell, { flex: 2 }]}
                      >
                        Parameter
                      </Text>
                      <Text
                        style={[styles.optimalParamsHeaderCell, { flex: 1 }]}
                      >
                        Value
                      </Text>
                      <Text
                        style={[styles.optimalParamsHeaderCell, { flex: 1 }]}
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
                          <Text style={[styles.optimalParamsCell, { flex: 2 }]}>
                            {marker.parameterName}
                          </Text>
                          <Text style={[styles.optimalParamsCell, { flex: 1 }]}>
                            {marker.value}
                          </Text>
                          <Text style={[styles.optimalParamsCell, { flex: 1 }]}>
                            {marker.units?.replace(/μ/g, MICRO)}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </View>
            {i < panels.length - 1 && <View break />}
          </React.Fragment>
        );
      })}
    </>
  );
};

const renderMarkdownContent = (content: string): React.ReactNode[] => {
  if (!content) return [];

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

const Watermark: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <View style={styles.watermarkContainer} fixed>
    <Image src={imageUrl} style={styles.watermarkImage} />
  </View>
);

const PDFDocument: React.FC<PDFDocumentProps> = ({
  result,
  whiteLabelConfig,
  signOffData,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
                // For logo type with valid URL - removed height constraint
                <Image
                  src={whiteLabelConfig.logoUrl}
                  style={styles.logoImage}
                />
              ) : (
                // Fallback if no valid logo URL - removed height constraint
                <Image src="/mendrx_pdf_logo.png" style={styles.logoImage} />
              ))}
            {/* Only show default logo if white labeling is not enabled */}
            {!whiteLabelConfig?.enabled &&
              !whiteLabelConfig?.useParentWhiteLabels && (
                <Image src="/mendrx_pdf_logo.png" style={styles.logoImage} />
              )}
          </View>
          <Text style={styles.title}>Root Cause Analysis Report</Text>
        </View>

        {/* Client Information Box */}
        <View style={styles.clientInfoBox}>
          <View style={styles.clientInfoGrid}>
            {/* Left Column */}
            <View style={styles.clientInfoColumn}>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Client Name:</Text>
                <Text style={styles.value}>{result.report.client.name}</Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Report Date:</Text>
                <Text style={styles.value}>
                  {new Date(result.report.reportDate).toLocaleDateString(
                    "en-US",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>
                  {formatGender(result.report.client.gender)}
                </Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Age:</Text>
                <Text style={styles.value}>
                  {calculateAgeAsOnReportDate(
                    result.report.client.birthMonth,
                    result.report.reportDate
                  )}
                </Text>
              </View>
              {result.report.bmi && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>BMI:</Text>
                  <Text style={styles.value}>{result.report.bmi}</Text>
                </View>
              )}
            </View>

            {/* Right Column */}
            <View style={styles.clientInfoColumn}>
              {result.report.height && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Height:</Text>
                  <Text style={styles.value}>{result.report.height} cm</Text>
                </View>
              )}
              {result.report.weight && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Weight:</Text>
                  <Text style={styles.value}>{result.report.weight} kg</Text>
                </View>
              )}
              {result.report.waist && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Waist:</Text>
                  <Text style={styles.value}>{result.report.waist} in</Text>
                </View>
              )}
              {result.report.diet && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Diet:</Text>
                  <Text style={styles.value}>
                    {formatDiet(result.report.diet)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Additional Information (Full Width) */}
          {result.report.lifestyleHabits &&
            result.report.lifestyleHabits?.length > 0 && (
              <View style={[styles.clientInfoRow, { marginTop: 8 }]}>
                <Text style={styles.label}>Lifestyle Habits:</Text>
                <Text style={[styles.value, { flex: 1 }]}>
                  {result.report.lifestyleHabits
                    .map((habit) => formatEnumValue(habit))
                    .join(", ")}
                </Text>
              </View>
            )}

          {result.report.existingConditions &&
            result.report.existingConditions?.length > 0 && (
              <View style={[styles.clientInfoRow, { marginTop: 4 }]}>
                <Text style={styles.label}>Known Conditions:</Text>
                <Text style={[styles.value, { flex: 1 }]}>
                  {result.report.existingConditions
                    .map((condition) =>
                      formatEnumValue(condition, { preserveSlashes: true })
                    )
                    .join(", ")}
                </Text>
              </View>
            )}
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
        {<View break />}

        <View style={styles.howToReadSection}>
          {/* Main Title */}
          <Text style={styles.howToReadTitle}>
            How to Read Your Functional Medicine Blood Report
          </Text>

          {/* Section 1 */}
          <Text style={styles.subsectionTitle}>
            1. Your Health Summary at a Glance
          </Text>
          <Text style={styles.subsectionText}>
            At the very top of your report, you’ll see a summary of{" "}
            <Text style={styles.boldText}>potential health concerns</Text>.
            These are based on patterns we’ve identified by looking at your{" "}
            <Text style={styles.boldText}>blood markers</Text> through a{" "}
            <Text style={styles.boldText}>functional medicine lens</Text>—a
            holistic approach that focuses on finding the{" "}
            <Text style={styles.boldText}>root cause</Text> of symptoms before
            they become illness.
          </Text>

          {/* Section 2 */}
          <Text style={styles.subsectionTitle}>
            2. Understanding Your Blood Markers
          </Text>
          <Text style={styles.subsectionText}>
            Your report includes a list of all the{" "}
            <Text style={styles.boldText}>blood markers</Text> uploaded from
            your lab blood report.
          </Text>

          <Image src="/how_to_read_pdf.png" style={styles.image} />
        </View>
        {<View break />}
        {result.report.notes && (
          <View style={styles.notesSection}>
            <View>{renderMarkdownContent(result.report.notes)}</View>
          </View>
        )}
        <View style={styles.divider} />
        {<View break />}
        {/* Blood Panel Display */}
        <BloodPanelPDF bloodPanelListMap={result.report.bloodPanelListMap} />

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

export const generatePDF = async (
  result: AnalysisResult,
  whiteLabelConfig?: WhiteLabelConfig
): Promise<string> => {
  let signOffData: SignOffData | undefined;
  try {
    const authClient = createAuthClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (session) {
      // Fetch custom signature data
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
    console.error("Error fetching signature data:", error);
    // Continue without signature if fetch fails
  }

  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <PDFDocument
      result={result}
      whiteLabelConfig={whiteLabelConfig}
      signOffData={signOffData}
    />
  ).toBlob();
  return URL.createObjectURL(blob);
};

// Add this function to src/utils/pdfGenerator.tsx

export const generateNotesPDF = async (
  report: Report,
  whiteLabelConfig?: WhiteLabelConfig
): Promise<string> => {
  let signOffData: SignOffData | undefined;

  try {
    const authClient = createAuthClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (session) {
      // Fetch custom signature data
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
    console.error("Error fetching signature data:", error);
    // Continue without signature if fetch fails
  }

  // Create a PDF document with just the client info and notes
  const NotesOnlyPDFDocument: React.FC<{
    report: Report;
    whiteLabelConfig?: WhiteLabelConfig;
    signOffData?: SignOffData;
  }> = ({ report, whiteLabelConfig, signOffData }) => (
    <Document>
      <Page size="A4" style={styles.page}>
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

          {/* Title Section - Now appears below the logo */}
          <Text style={styles.title}>RCA Summary & Micronutrient Report</Text>
        </View>

        {/* Client Information Box */}
        <View style={styles.clientInfoBox}>
          <View style={styles.clientInfoGrid}>
            {/* Left Column */}
            <View style={styles.clientInfoColumn}>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Client Name:</Text>
                <Text style={styles.value}>{report.client.name}</Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Report Date:</Text>
                <Text style={styles.value}>
                  {new Date(report.reportDate).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>
                  {formatGender(report.client.gender)}
                </Text>
              </View>
              <View style={styles.clientInfoRow}>
                <Text style={styles.label}>Age:</Text>
                <Text style={styles.value}>
                  {calculateAgeAsOnReportDate(
                    report.client.birthMonth,
                    report.reportDate
                  )}
                </Text>
              </View>
              {report.bmi && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>BMI:</Text>
                  <Text style={styles.value}>{report.bmi}</Text>
                </View>
              )}
            </View>

            {/* Right Column */}
            <View style={styles.clientInfoColumn}>
              {report.height && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Height:</Text>
                  <Text style={styles.value}>{report.height} cm</Text>
                </View>
              )}
              {report.weight && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Weight:</Text>
                  <Text style={styles.value}>{report.weight} kg</Text>
                </View>
              )}
              {report.waist && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Waist:</Text>
                  <Text style={styles.value}>{report.waist} in</Text>
                </View>
              )}
              {report.diet && (
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Diet:</Text>
                  <Text style={styles.value}>{formatDiet(report.diet)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Additional Information (Full Width) */}
          {report.lifestyleHabits && report.lifestyleHabits?.length > 0 && (
            <View style={[styles.clientInfoRow, { marginTop: 8 }]}>
              <Text style={styles.label}>Lifestyle Habits:</Text>
              <Text style={[styles.value, { flex: 1 }]}>
                {report.lifestyleHabits
                  .map((habit) => formatEnumValue(habit))
                  .join(", ")}
              </Text>
            </View>
          )}

          {report.existingConditions &&
            report.existingConditions?.length > 0 && (
              <View style={[styles.clientInfoRow, { marginTop: 4 }]}>
                <Text style={styles.label}>Known Conditions:</Text>
                <Text style={[styles.value, { flex: 1 }]}>
                  {report.existingConditions
                    .map((condition) =>
                      formatEnumValue(condition, { preserveSlashes: true })
                    )
                    .join(", ")}
                </Text>
              </View>
            )}
        </View>

        {/* Notes Section */}
        {report.notes && (
          <View style={styles.notesSection}>
            <View>{renderMarkdownContent(report.notes)}</View>
          </View>
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

  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(
    <NotesOnlyPDFDocument
      report={report}
      whiteLabelConfig={whiteLabelConfig}
      signOffData={signOffData}
    />
  ).toBlob();
  return URL.createObjectURL(blob);
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
