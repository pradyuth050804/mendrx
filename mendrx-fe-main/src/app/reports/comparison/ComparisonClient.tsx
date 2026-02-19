// File: src/app/reports/comparison/ComparisonClient.tsx
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateComparisonPDF } from "@/utils/comparisonPdfGenerator";
import toast from "react-hot-toast";
import { createAuthClient } from "@/lib/supabase-auth";
import { getApiUrl } from "@/utils/api";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowRightLeft,
  Download,
} from "lucide-react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ComparisonResponseModel,
  ParameterValue,
  Range,
  BloodMarkerResultEnum,
} from "@/types/comparison";

const getTrendIcon = (trend: string | null) => {
  if (!trend) return null;

  switch (trend.toUpperCase()) {
    case "IMPROVING":
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case "DETERIORATING":
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    case "CONSISTENT":
      return <Minus className="h-5 w-5 text-blue-500" />;
    case "PERSISTENTLY_HIGH":
      return <ArrowRightLeft className="h-5 w-5 text-orange-500" />;
    case "PERSISTENTLY_LOW":
      return <ArrowRightLeft className="h-5 w-5 text-yellow-500" />;
    case "FLUCTUATING":
      return <ArrowRightLeft className="h-5 w-5 text-purple-500" />;
    default:
      return null;
  }
};

const getTrendStyle = (trend: string | null) => {
  if (!trend) return "";

  switch (trend.toUpperCase()) {
    case "IMPROVING":
      return "text-green-600";
    case "DETERIORATING":
      return "text-red-600";
    case "CONSISTENT":
      return "text-blue-600";
    case "PERSISTENTLY_HIGH":
      return "text-orange-600";
    case "PERSISTENTLY_LOW":
      return "text-yellow-600";
    case "FLUCTUATING":
      return "text-purple-600";
    default:
      return "";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
const ComparisonClient: React.FC<{ data: ComparisonResponseModel }> = ({
  data,
}) => {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const router = useRouter();

  const handlePDFDownload = async () => {
    setIsPdfLoading(true);
    try {
      // Get current session using Supabase auth
      const authClient = createAuthClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      // Fetch white label config using session token
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/white-label/config`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch white label config");
      }

      const result = await response.json();
      const whiteLabel = result.success ? result.data : undefined;

      // Generate PDF with white label config
      const url = await generateComparisonPDF(data, whiteLabel);
      const link = document.createElement("a");
      link.href = url;
      link.download = `comparison_analysis_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsPdfLoading(false);
    }
  };
  const getYAxisConfig = (values: ParameterValue[], optimalRange: Range) => {
    const dataValues = values.map((v) => Number(v.value));
    const minValue = Math.min(...dataValues);
    const maxValue = Math.max(...dataValues);

    // Calculate domain with padding
    const range = maxValue - minValue;
    const padding = Math.max(range * 0.3, range || 1);

    // Determine which reference lines to show based on data values
    const showMax = minValue >= optimalRange.min;
    const showMin = maxValue <= optimalRange.max;

    // Adjust domain based on which reference lines are needed
    const domainMin = showMin
      ? Math.min(minValue - padding, optimalRange.min - padding / 2)
      : minValue - padding;
    const domainMax = showMax
      ? Math.max(maxValue + padding, optimalRange.max + padding / 2)
      : maxValue + padding;

    // Calculate intermediate ticks between min and max
    const valueRange = domainMax - domainMin;
    const tickInterval = valueRange / 4;

    // Generate basic ticks
    const baseTicks = Array.from(
      { length: 0 },
      (_, i) => domainMin + tickInterval * i
    );

    // Add reference lines only if they're within the data range
    const ticks = [...baseTicks];
    if (showMin && !ticks.includes(optimalRange.min)) {
      ticks.push(optimalRange.min);
    }
    if (showMax && !ticks.includes(optimalRange.max)) {
      ticks.push(optimalRange.max);
    }

    // Sort ticks and remove duplicates
    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);

    return {
      domain: [domainMin, domainMax] as [number, number],
      ticks: uniqueTicks,
      axisLine: true,
      tickLine: true,
      grid: false,
      tickFormatter: (value: number) => {
        if (showMax && value === optimalRange.max) {
          return `Max ${value.toFixed(1)}`;
        }
        if (showMin && value === optimalRange.min) {
          return `Min ${value.toFixed(1)}`;
        }
        return value.toFixed(1);
      },
      showMin,
      showMax,
    };
  };

  const formatPercentageChange = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }
    const sign = value > 0 ? "+" : "";
    return `${sign}${Number(value).toFixed(1)}%`;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="mr-2" size={16} />
            Reports List
          </button>

          <Button
            onClick={handlePDFDownload}
            disabled={isPdfLoading}
            className="bg-blue-500 hover:bg-blue-700 text-white"
          >
            <Download className="mr-2" size={16} />
            <span className="hidden md:inline">Download </span>
            <span>{isPdfLoading ? "Generating..." : "Comparison PDF"}</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">
          Comparison Analysis
        </h1>
      </div>
      {/* Report Information */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        {data.reports.every(
          (report) => report.clientId === data.reports[0].clientId
        ) ? (
          // All reports belong to same client
          <div>
            <h2 className="text-lg font-semibold mb-2">Client Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Client Name:</span>{" "}
                {data.reports[0].clientName}
              </div>
              <div>
                <span className="font-medium">Age:</span> {data.reports[0].age}
              </div>
              <div>
                <span className="font-medium">Gender:</span>{" "}
                {data.reports[0].gender.charAt(0).toUpperCase() +
                  data.reports[0].gender.slice(1).toLowerCase()}
              </div>
            </div>
          </div>
        ) : (
          // Multiple clients
          <div>
            <h2 className="text-lg font-semibold mb-2">Reports Information</h2>
            <div className="space-y-4">
              {data.reports.map((report, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-white rounded-lg"
                >
                  <div>
                    <span className="font-medium">Client Name:</span>{" "}
                    {report.clientName}
                  </div>
                  <div>
                    <span className="font-medium">Age:</span> {report.age}
                  </div>
                  <div>
                    <span className="font-medium">Gender:</span>{" "}
                    {report.gender.charAt(0).toUpperCase() +
                      report.gender.slice(1).toLowerCase()}
                  </div>
                  <div>
                    <span className="font-medium">RCA Updated Date:</span>{" "}
                    {new Date(report.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Summary Stats */}
      {data.summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="text-3xl font-bold">
                {data.summary.totalParameters}
              </div>
              <div className="text-sm text-gray-600">Total Parameters</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-green-600">
                {data.summary.improvingCount}
              </div>
              <div className="text-sm text-gray-600">Improving</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-red-600">
                {data.summary.deterioratingCount}
              </div>
              <div className="text-sm text-gray-600">Deteriorating</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-blue-600">
                {data.summary.consistentCount}
              </div>
              <div className="text-sm text-gray-600">Consistent</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-orange-600">
                {data.summary.persistentlyHighCount || 0}
              </div>
              <div className="text-sm text-gray-600">Persistently High</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-yellow-600">
                {data.summary.persistentlyLowCount || 0}
              </div>
              <div className="text-sm text-gray-600">Persistently Low</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-600">
                {data.summary.fluctuatingCount}
              </div>
              <div className="text-sm text-gray-600">Fluctuating</div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Panel Comparisons */}
      {data.panelComparisons.map((panel, index) => (
        <Card key={index} className="mb-8">
          <CardHeader className="bg-muted/50 border-b border-border py-4">
            <CardTitle className="flex items-center justify-between">
              <span>{panel.panelName}</span>
              <div className="flex items-center gap-2 text-base">
                <span className="text-gray-600">Current Status:</span>
                <span
                  className={`${
                    panel.status === "GOOD"
                      ? "text-[#4CAF50]"
                      : panel.status === "FAIR"
                      ? "text-[#FFA726]"
                      : "text-[#E53935]"
                  }`}
                >
                  {panel.status}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {panel.bloodMarkerComparisons.map((comparison, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        {comparison.parameterName}
                        <span className="flex items-center gap-1 text-sm">
                          {getTrendIcon(comparison.trend)}
                          <span className={getTrendStyle(comparison.trend)}>
                            {comparison.trend
                              ? comparison.trend.replace("_", " ")
                              : "No Trend"}
                          </span>
                        </span>
                        {comparison.isPrimary && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Optimal Range: {comparison.optimalRange.min} -{" "}
                        {comparison.optimalRange.max}{" "}
                        {comparison.values[0]?.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600">
                        {formatPercentageChange(comparison.percentageChange)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Overall Change
                      </div>
                    </div>
                  </div>

                  {comparison.values.length > 0 && (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={comparison.values}
                          margin={{ top: 30, right: 30, left: 30, bottom: 70 }}
                        >
                          <XAxis
                            dataKey="reportDate"
                            tickFormatter={formatDate}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            tickMargin={25}
                            stroke="#666"
                            fontSize={12}
                            padding={{ left: 30, right: 30 }}
                          />

                          {(() => {
                            const yAxisConfig = getYAxisConfig(
                              comparison.values,
                              comparison.optimalRange
                            );
                            return (
                              <>
                                <YAxis
                                  {...yAxisConfig}
                                  stroke="#666"
                                  fontSize={12}
                                  width={70}
                                  tickMargin={8}
                                  interval={0}
                                  allowDataOverflow={true}
                                  scale="linear"
                                  tick={({ x, y, payload }) => (
                                    <g transform={`translate(${x},${y})`}>
                                      <text
                                        x={-10}
                                        y={0}
                                        dy={4}
                                        textAnchor="end"
                                        fill="#666"
                                        fontSize={12}
                                      >
                                        {yAxisConfig.tickFormatter(
                                          payload.value
                                        )}
                                      </text>
                                    </g>
                                  )}
                                />

                                {/* Reference Lines using the same yAxisConfig */}
                                {yAxisConfig.showMin && (
                                  <ReferenceLine
                                    y={comparison.optimalRange.min}
                                    stroke="#666"
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                  />
                                )}
                                {yAxisConfig.showMax && (
                                  <ReferenceLine
                                    y={comparison.optimalRange.max}
                                    stroke="#666"
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                  />
                                )}

                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke="#2563eb"
                                  strokeWidth={2}
                                  dot={{
                                    fill: "#fff",
                                    stroke: "#2563eb",
                                    strokeWidth: 2,
                                    r: 4,
                                  }}
                                  label={({ x, y, value }) => (
                                    <text
                                      x={x}
                                      y={y - 10}
                                      fill="#666"
                                      fontSize={12}
                                      textAnchor="middle"
                                      dy={-4}
                                    >
                                      {Number(value).toFixed(1)}
                                    </text>
                                  )}
                                />
                              </>
                            );
                          })()}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {comparison.values.map((value, vidx) => (
                      <div
                        key={vidx}
                        className={`p-4 rounded-lg ${
                          value.status === BloodMarkerResultEnum.OPTIMAL
                            ? "bg-green-50"
                            : value.status === BloodMarkerResultEnum.HIGH
                            ? "bg-red-50"
                            : "bg-yellow-50"
                        }`}
                      >
                        <div className="text-lg font-semibold">
                          {value.value} {value.unit}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(value.reportDate)}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div className="text-xs text-gray-500">Status:</div>
                          <div className="text-xs font-medium">
                            {value.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  );
};

export default ComparisonClient;
