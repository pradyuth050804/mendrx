// File: src/utils/comparisonPdfGenerator.tsx
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
  Rect,
  Image,
} from "@react-pdf/renderer";
import {
  ComparisonResponseModel,
  PanelComparison,
  BloodMarkerComparison,
  ParameterValue,
  BloodMarkerResultEnum,
  TrendType,
} from "@/types/comparison";
import { formatGender } from "@/utils/formatters";
import { DEFAULT_DISCLAIMER } from "@/constants/disclaimers";
import { createAuthClient } from "@/lib/supabase-auth";
import { getApiUrl } from "@/utils/api";

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

interface PDFDocumentProps {
  data: ComparisonResponseModel;
  whiteLabelConfig?: WhiteLabelConfig;
  signOffData?: SignOffData;
}
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
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
    fontSize: 16,
    fontWeight: 700,
    textAlign: "left",
    color: "#111827",
  },
  clientInfoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    padding: 15,
    marginBottom: 20,
    border: "1pt solid #E5E7EB",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  clientInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  clientInfoRow: {
    padding: 8,
    backgroundColor: "white",
    borderRadius: 4,
    flexDirection: "row",
    gap: 16,
    flex: 1,
  },
  label: {
    color: "#374151",
    fontWeight: 500,
    fontSize: 9,
  },
  value: {
    color: "#111827",
    fontSize: 9,
  },
  summaryStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    padding: 16,
    borderRadius: 4,
    width: "15%",
  },
  statValue: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 8,
    color: "#6B7280",
  },
  panelCard: {
    marginBottom: 20,
    border: "1pt solid #E5E7EB",
    borderRadius: 4,
  },

  parameterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 16,
  },

  parameterCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    padding: 12,
  },
  panelHeader: {
    padding: 12,
    borderBottom: "1pt solid #E5E7EB",
    backgroundColor: "#F9FAFB",
    width: "100%",
  },
  panelHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 700,
    maxWidth: "70%",
  },
  panelStatus: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: "30%", // Ensure space for status
    justifyContent: "flex-end",
  },
  panelStatusLabel: {
    fontSize: 9,
    color: "#6B7280",
    marginRight: 4,
  },
  panelStatusValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  parameterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  parameterName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#111827",
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: 6,
  },
  optimalRange: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 6,
  },
  changeValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#2563EB",
    textAlign: "right",
  },
  changeLabel: {
    fontSize: 8,
    color: "#6B7280",
    textAlign: "right",
  },
  chartContainer: {
    height: 200,
    marginVertical: 8, // Reduced from 12
  },

  valueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4, // Reduced from 8
  },

  valueCard: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    minWidth: "45%",
    marginBottom: 8, // Add margin to ensure proper spacing
  },
  valueText: {
    fontSize: 8, // Reduced from 10
    fontWeight: 500,
  },
  valueDate: {
    fontSize: 7, // Reduced from 8
    color: "#6B7280",
    marginTop: 1,
  },
  valueStatus: {
    fontSize: 7, // Reduced from 8
    marginTop: 1, // Reduced from 4
  },
  trendIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
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

// Add SVG components for trend icons
const TrendingUpIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    <Path
      d="M23 6L13.5 15.5L8.5 10.5L1 18"
      stroke="#4CAF50"
      strokeWidth={2}
      fill="none"
    />
    <Path d="M17 6H23V12" stroke="#4CAF50" strokeWidth={2} fill="none" />
  </Svg>
);

const TrendingDownIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    <Path
      d="M23 18L13.5 8.5L8.5 13.5L1 6"
      stroke="#F44336"
      strokeWidth={2}
      fill="none"
    />
    <Path d="M17 18H23V12" stroke="#F44336" strokeWidth={2} fill="none" />
  </Svg>
);

const ConsistentIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    <Path d="M5 12H19" stroke="#2196F3" strokeWidth={2} />
  </Svg>
);

const FluctuatingIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    <Path
      d="M2 12L6 8L10 16L14 4L18 12L22 8"
      stroke="#9C27B0"
      strokeWidth={2}
      fill="none"
    />
  </Svg>
);

const PersistentlyHighIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    {/* Heartbeat-style zigzag pattern for high */}
    <Path
      d="M3 12h4l2-4 4 8 4-8 2 4h4"
      stroke="#FF9800"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PersistentlyLowIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    {/* Heartbeat-style zigzag pattern for low */}
    <Path
      d="M3 12h4l2-4 4 8 4-8 2 4h4"
      stroke="#FFD600"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Update the rendering functions with proper types
const renderPanelHeader = (panel: PanelComparison): JSX.Element => (
  <View style={styles.panelHeader}>
    <View style={styles.panelHeaderContent}>
      <Text style={styles.panelTitle}>{panel.panelName}</Text>
      <View style={styles.panelStatus}>
        <Text style={styles.panelStatusLabel}>Current Status: </Text>
        <Text
          style={[
            styles.panelStatusValue,
            { color: getStatusColor(panel.status) },
          ]}
        >
          {panel.status}
        </Text>
      </View>
    </View>
  </View>
);

const renderTrendIcon = (trend: TrendType | null): JSX.Element | null => {
  switch (trend?.toUpperCase()) {
    case "IMPROVING":
      return <TrendingUpIcon />;
    case "DETERIORATING":
      return <TrendingDownIcon />;
    case "CONSISTENT":
      return <ConsistentIcon />;
    case "PERSISTENTLY_HIGH":
      return <PersistentlyHighIcon />;
    case "PERSISTENTLY_LOW":
      return <PersistentlyLowIcon />;
    case "FLUCTUATING":
      return <FluctuatingIcon />;
    default:
      return null;
  }
};

const renderParameterHeader = (
  comparison: BloodMarkerComparison
): JSX.Element => (
  <View style={styles.parameterHeader}>
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={styles.parameterName}>{comparison.parameterName}</Text>
        {comparison.isPrimary && (
          <View
            style={{ backgroundColor: "#DBEAFE", padding: 2, borderRadius: 2 }}
          >
            <Text style={{ fontSize: 6, color: "#2563EB" }}>Primary</Text>
          </View>
        )}
      </View>
      <View style={styles.trendContainer}>
        {renderTrendIcon(comparison.trend)}
        <Text
          style={[styles.trendText, { color: getTrendColor(comparison.trend) }]}
        >
          {comparison.trend ? comparison.trend.replace("_", " ") : "No Trend"}
        </Text>
      </View>
    </View>
    <View>
      <Text style={styles.changeValue}>
        {formatPercentageChange(comparison.percentageChange)}
      </Text>
      <Text style={styles.changeLabel}>Overall Change</Text>
    </View>
  </View>
);

const renderValueCard = (value: ParameterValue, idx: number): JSX.Element => (
  <View
    key={idx}
    style={[
      styles.valueCard,
      { backgroundColor: getStatusBackgroundColor(value.status) },
    ]}
  >
    <Text style={styles.valueText}>
      {value.value} {value.unit}
    </Text>
    <Text style={styles.valueDate}>{formatDate(value.reportDate)}</Text>
    <Text style={styles.valueStatus}>Status: {value.status}</Text>
  </View>
);

// Update helper functions with proper types
const getStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case "GOOD":
      return "#4CAF50";
    case "FAIR":
      return "#FFA726";
    case "POOR":
      return "#F06262";
    default:
      return "#666666";
  }
};

const getTrendColor = (trend: TrendType | null): string => {
  if (!trend) return "#666666";
  switch (trend.toUpperCase()) {
    case "IMPROVING":
      return "#4CAF50";
    case "DETERIORATING":
      return "#F44336";
    case "CONSISTENT":
      return "#2196F3";
    case "PERSISTENTLY_HIGH":
      return "#FF9800";
    case "PERSISTENTLY_LOW":
      return "#FFD600";
    case "FLUCTUATING":
      return "#9C27B0";
    default:
      return "#666666";
  }
};

const getStatusBackgroundColor = (status: BloodMarkerResultEnum): string => {
  switch (status) {
    case BloodMarkerResultEnum.OPTIMAL:
      return "#F0FDF4";
    case BloodMarkerResultEnum.HIGH:
      return "#FEF2F2";
    case BloodMarkerResultEnum.LOW:
      return "#FFFBEB";
    default:
      return "#F9FAFB";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatPercentageChange = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(1)}%`;
};

interface ChartPoint {
  x: number;
  y: number;
  value: string;
  date: string;
}

const LineChart: React.FC<{
  values: ParameterValue[];
  width: number;
  height: number;
  optimalRange: { min: number; max: number };
}> = ({ values, width, height, optimalRange }) => {
  const padding = { top: 15, right: 20, bottom: 90, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Process and validate data
  const validValues = values.filter((v) => {
    const numValue =
      typeof v.value === "string" ? parseFloat(v.value) : v.value;
    return !isNaN(numValue) && isFinite(numValue);
  });

  // Early return for single point visualization
  if (validValues.length === 1) {
    const singleValue = validValues[0];
    const yValue =
      typeof singleValue.value === "string"
        ? parseFloat(singleValue.value)
        : singleValue.value;

    // Calculate scales similar to multi-point chart
    const dataMin = Math.min(yValue, optimalRange.min);
    const dataMax = Math.max(yValue, optimalRange.max);
    const yRange = dataMax - dataMin;
    const yPadding = Math.max(yRange * 0.2, 0.1);
    const yMin = Math.max(0, dataMin - yPadding);
    const yMax = dataMax + yPadding;

    const yScale = (y: number) =>
      Math.min(
        height - padding.bottom,
        Math.max(
          padding.top,
          height - (((y - yMin) / (yMax - yMin)) * chartHeight + padding.bottom)
        )
      );

    // Position point in center of x-axis
    const pointX = padding.left + chartWidth / 2;
    const pointY = yScale(yValue);

    return (
      <Svg width={width.toString()} height={height.toString()}>
        {/* Same axis and grid code as before */}
        {/* ... (keep existing axis and grid rendering code) ... */}

        {/* Single data point */}
        <Circle
          cx={pointX}
          cy={pointY}
          r={4} // Slightly larger point for single value
          fill="white"
          stroke="#2563eb"
          strokeWidth={2}
        />

        {/* Value label */}
        <Text
          x={pointX}
          y={pointY - 12}
          style={{
            fontSize: 8,
            textAnchor: "middle",
            fill: "#666666",
            fontWeight: "medium",
          }}
        >
          {typeof singleValue.value === "string"
            ? parseFloat(singleValue.value).toFixed(1)
            : singleValue.value.toFixed(1)}
        </Text>

        {/* Date label */}
        <Text
          x={pointX}
          y={height - padding.bottom + 12}
          style={{
            fontSize: 7,
            textAnchor: "middle",
            fill: "#666666",
          }}
        >
          {formatDate(singleValue.reportDate)}
        </Text>
      </Svg>
    );
  }

  const yValues = validValues.map((v) =>
    typeof v.value === "string" ? parseFloat(v.value) : v.value
  );

  const dataMin = Math.min(...yValues, optimalRange.min);
  const dataMax = Math.max(...yValues, optimalRange.max);
  const yRange = dataMax - dataMin;
  const yPadding = Math.max(yRange * 0.2, 0.1);
  const yMin = Math.max(0, dataMin - yPadding);
  const yMax = dataMax + yPadding;

  const xValues = validValues.map((v) => new Date(v.reportDate).getTime());
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xRange = xMax - xMin;

  const xPadding = xRange * 0.1;
  const adjustedXMin = xMin - xPadding;
  const adjustedXMax = xMax + xPadding;

  const xScale = (x: number) =>
    Math.min(
      width - padding.right,
      Math.max(
        padding.left,
        ((x - adjustedXMin) / (adjustedXMax - adjustedXMin)) * chartWidth +
          padding.left
      )
    );

  const yScale = (y: number) =>
    Math.min(
      height - padding.bottom,
      Math.max(
        padding.top,
        height - (((y - yMin) / (yMax - yMin)) * chartHeight + padding.bottom)
      )
    );

  const points = validValues.map((value) => ({
    x: xScale(new Date(value.reportDate).getTime()),
    y: yScale(
      typeof value.value === "string" ? parseFloat(value.value) : value.value
    ),
    value:
      typeof value.value === "string"
        ? parseFloat(value.value).toFixed(1)
        : value.value.toFixed(1),
    date: value.reportDate,
  }));

  // Calculate intermediate ticks for better Y-axis labeling
  const yTicks = [];
  const tickCount = 5;
  const tickInterval = (yMax - yMin) / (tickCount - 1);
  for (let i = 0; i < tickCount; i++) {
    yTicks.push(yMin + tickInterval * i);
  }

  return (
    <Svg width={width.toString()} height={height.toString()}>
      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <Line
          key={`grid-${i}`}
          x1={padding.left}
          y1={yScale(tick)}
          x2={width - padding.right}
          y2={yScale(tick)}
          stroke="#E5E7EB"
          strokeWidth={0.5}
        />
      ))}

      {/* Reference lines for optimal range */}
      <Line
        x1={padding.left}
        y1={yScale(optimalRange.min)}
        x2={width - padding.right}
        y2={yScale(optimalRange.min)}
        stroke="#666666"
        strokeWidth={0.5}
        strokeDasharray="3,3"
      />
      <Line
        x1={padding.left}
        y1={yScale(optimalRange.max)}
        x2={width - padding.right}
        y2={yScale(optimalRange.max)}
        stroke="#666666"
        strokeWidth={0.5}
        strokeDasharray="3,3"
      />

      {/* Y-axis */}
      <Line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#666666"
        strokeWidth={0.5}
      />

      {/* X-axis */}
      <Line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#666666"
        strokeWidth={0.5}
      />

      {/* Y-axis labels with staggered Min/Max and values */}
      {yTicks.map((tick, i) => (
        <Text
          key={`y-label-${i}`}
          x={padding.left - 8}
          y={yScale(tick) + 3}
          style={{
            fontSize: 8,
            textAnchor: "end",
            fill: "#666666",
          }}
        >
          {tick.toFixed(1)}
        </Text>
      ))}

      {/* Optimal range labels with offset positioning */}
      <Text
        x={padding.left - 45}
        y={yScale(optimalRange.min) + 3}
        style={{
          fontSize: 7,
          textAnchor: "end",
          fill: "#666666",
          fontWeight: "bold",
        }}
      >
        Min
      </Text>
      <Text
        x={padding.left - 8}
        y={yScale(optimalRange.min) + 3}
        style={{
          fontSize: 7,
          textAnchor: "end",
          fill: "#666666",
        }}
      >
        {optimalRange.min}
      </Text>

      <Text
        x={padding.left - 45}
        y={yScale(optimalRange.max) + 3}
        style={{
          fontSize: 7,
          textAnchor: "end",
          fill: "#666666",
          fontWeight: "bold",
        }}
      >
        Max
      </Text>
      <Text
        x={padding.left - 8}
        y={yScale(optimalRange.max) + 3}
        style={{
          fontSize: 7,
          textAnchor: "end",
          fill: "#666666",
        }}
      >
        {optimalRange.max}
      </Text>

      {/* Data line */}
      {points.length > 1 && (
        <Path
          d={points
            .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
            .join(" ")}
          stroke="#2563eb"
          strokeWidth={1.5}
          fill="none"
        />
      )}

      {/* Data points and labels */}
      {points.map((point, index) => (
        <React.Fragment key={index}>
          {/* Data point */}
          <Circle
            cx={point.x}
            cy={point.y}
            r={3}
            fill="white"
            stroke="#2563eb"
            strokeWidth={1.5}
          />

          {/* Value label */}
          <Text
            x={point.x}
            y={point.y - 12}
            style={{
              fontSize: 8,
              textAnchor: "middle",
              fill: "#666666",
              fontWeight: "medium",
            }}
          >
            {point.value}
          </Text>

          <Text
            x={point.x}
            y={height - padding.bottom + 12}
            style={{
              fontSize: 7,
              textAnchor: "end", // Changed from "middle" to "end"
              fill: "#666666",
              transform: `rotate(-25, ${point.x}, ${
                height - padding.bottom + 12
              })`,
              transformOrigin: `${point.x}px ${height - padding.bottom + 12}px`, // Added transformOrigin
            }}
          >
            {formatDate(point.date)}
          </Text>
        </React.Fragment>
      ))}
    </Svg>
  );
};

const Watermark: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <View style={styles.watermarkContainer} fixed>
    <Image src={imageUrl} style={styles.watermarkImage} />
  </View>
);

const ComparisonPDFDocument: React.FC<PDFDocumentProps> = ({
  data,
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
          <Text style={styles.title}>Comparison Analysis Report</Text>
        </View>
        {/* Client Information */}
        <View style={styles.clientInfoBox}>
          {data.reports.every(
            (report) => report.clientId === data.reports[0].clientId
          ) ? (
            <>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <View style={styles.clientInfoGrid}>
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Client Name:</Text>
                  <Text style={styles.value}>{data.reports[0].clientName}</Text>
                </View>
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Age:</Text>
                  <Text style={styles.value}>{data.reports[0].age}</Text>
                </View>
                <View style={styles.clientInfoRow}>
                  <Text style={styles.label}>Gender:</Text>
                  <Text style={styles.value}>
                    {formatGender(data.reports[0].gender)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Reports Information</Text>
              {data.reports.map((report, index) => (
                <View
                  key={index}
                  style={[
                    styles.clientInfoGrid,
                    { marginBottom: index < data.reports.length - 1 ? 8 : 0 },
                  ]}
                >
                  <View style={styles.clientInfoRow}>
                    <Text style={styles.label}>Client Name:</Text>
                    <Text style={styles.value}>{report.clientName}</Text>
                  </View>
                  <View style={styles.clientInfoRow}>
                    <Text style={styles.label}>Age:</Text>
                    <Text style={styles.value}>{report.age}</Text>
                  </View>
                  <View style={styles.clientInfoRow}>
                    <Text style={styles.label}>Gender:</Text>
                    <Text style={styles.value}>
                      {formatGender(report.gender)}
                    </Text>
                  </View>
                  <View style={styles.clientInfoRow}>
                    <Text style={styles.label}>RCA Updated Date:</Text>
                    <Text style={styles.value}>
                      {formatDate(report.updatedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
        {/* Summary Statistics */}
        {data.summary && (
          <View style={styles.summaryStats}>
            <View style={[styles.statCard, { backgroundColor: "#F9FAFB" }]}>
              <Text style={styles.statValue}>
                {data.summary.totalParameters}
              </Text>
              <Text style={styles.statLabel}>Total Parameters</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#F0FDF4" }]}>
              <Text style={[styles.statValue, { color: "#4CAF50" }]}>
                {data.summary.improvingCount}
              </Text>
              <Text style={styles.statLabel}>Improving</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FEF2F2" }]}>
              <Text style={[styles.statValue, { color: "#F44336" }]}>
                {data.summary.deterioratingCount}
              </Text>
              <Text style={styles.statLabel}>Deteriorating</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#EFF6FF" }]}>
              <Text style={[styles.statValue, { color: "#2196F3" }]}>
                {data.summary.consistentCount}
              </Text>
              <Text style={styles.statLabel}>Consistent</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFF7ED" }]}>
              <Text style={[styles.statValue, { color: "#FF9800" }]}>
                {data.summary.persistentlyHighCount || 0}
              </Text>
              <Text style={styles.statLabel}>Persistently High</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFFBEB" }]}>
              <Text style={[styles.statValue, { color: "#FFD600" }]}>
                {data.summary.persistentlyLowCount || 0}
              </Text>
              <Text style={styles.statLabel}>Persistently Low</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FAF5FF" }]}>
              <Text style={[styles.statValue, { color: "#9C27B0" }]}>
                {data.summary.fluctuatingCount}
              </Text>
              <Text style={styles.statLabel}>Fluctuating</Text>
            </View>
          </View>
        )}
        <View>
          {data.panelComparisons.map((panel, index) => (
            <View key={index} style={styles.panelCard}>
              {renderPanelHeader(panel)}
              <View style={styles.parameterGrid}>
                {panel.bloodMarkerComparisons.map((comparison, idx) => (
                  <View
                    key={idx}
                    style={styles.parameterCard}
                    wrap={false} // This is a valid prop in react-pdf
                  >
                    {renderParameterHeader(comparison)}
                    <Text style={styles.optimalRange}>
                      Optimal Range: {comparison.optimalRange.min}-
                      {comparison.optimalRange.max} {comparison.values[0]?.unit}
                    </Text>

                    <View style={{ height: 120, marginVertical: 4 }}>
                      <LineChart
                        values={comparison.values}
                        width={200}
                        height={180}
                        optimalRange={comparison.optimalRange}
                      />
                    </View>

                    <View style={styles.valueGrid}>
                      {comparison.values.map((value, vidx) =>
                        renderValueCard(value, vidx)
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
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

export const generateComparisonPDF = async (
  data: ComparisonResponseModel,
  whiteLabelConfig?: WhiteLabelConfig
): Promise<string> => {
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
    <ComparisonPDFDocument
      data={data}
      whiteLabelConfig={whiteLabelConfig}
      signOffData={signOffData}
    />
  ).toBlob();
  return URL.createObjectURL(blob);
};
