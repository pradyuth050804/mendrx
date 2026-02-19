// File: src/app/reports/comparison/MultiClientComparisonClient.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type {
  ComparisonResponseModel,
  ParameterValue,
  Range,
} from "@/types/comparison";

interface MultiClientComparisonProps {
  data: ComparisonResponseModel;
}

interface YAxisConfig {
  domain: [number, number];
  ticks: number[];
  axisLine: boolean;
  tickLine: boolean;
  grid: boolean;
  tickFormatter: (value: number) => string;
  showMin: boolean;
  showMax: boolean;
}

const MultiClientComparisonClient: React.FC<MultiClientComparisonProps> = ({
  data,
}) => {
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    const report = data.reports.find((r) => r.id === payload.reportId);

    return (
      <g>
        {/* Value with status label above the point */}
        <text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          fill="#666"
          fontSize={11}
          fontWeight="500"
        >
          {`${Number(payload.value).toFixed(1)} (${payload.status})`}
        </text>
        {/* Client ID below the point */}
        <text x={cx} y={cy + 25} textAnchor="middle" fill="#666" fontSize={12}>
          {report?.clientName}
        </text>
        <circle
          cx={cx}
          cy={cy}
          r={4}
          stroke="#2563eb"
          strokeWidth={2}
          fill="#fff"
        />
      </g>
    );
  };

  const CustomizedLabel: React.FC<any> = ({ x, y, value, index, payload }) => {
    const chartData = payload?.chartData;
    if (!chartData || index === 0) return null;

    const prevData = chartData[index - 1];
    if (!prevData) return null;

    const currentValue = Number(value);
    const prevValue = Number(prevData.value);
    const difference = (currentValue - prevValue).toFixed(1);
    const sign = Number(difference) > 0 ? "+" : "";

    return (
      <g>
        <text x={x} y={y - 15} textAnchor="middle" fill="#666" fontSize={11}>
          {`${sign}${difference}`}
        </text>
      </g>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getYAxisConfig = (values: ParameterValue[]): YAxisConfig => {
    const dataValues = values.map((v) => Number(v.value));
    const minValue = Math.min(...dataValues);
    const maxValue = Math.max(...dataValues);

    // Find min and max from all gender-specific ranges
    const allRanges = values
      .map((v) => v.genderSpecificRange)
      .filter((r): r is Range => r !== undefined);
    const minRangeValue = Math.min(...allRanges.map((r) => r.min));
    const maxRangeValue = Math.max(...allRanges.map((r) => r.max));

    // Calculate domain with padding
    const range = maxValue - minValue;
    const padding = Math.max(range * 0.3, range || 1);

    const showMax = minValue >= minRangeValue;
    const showMin = maxValue <= maxRangeValue;

    const domainMin = showMin
      ? Math.min(minValue - padding, minRangeValue - padding / 2)
      : minValue - padding;
    const domainMax = showMax
      ? Math.max(maxValue + padding, maxRangeValue + padding / 2)
      : maxValue + padding;

    const valueRange = domainMax - domainMin;
    const tickInterval = valueRange / 4;
    const baseTicks = Array.from(
      { length: 5 },
      (_, i) => domainMin + tickInterval * i
    );
    const ticks = [...baseTicks];

    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);

    return {
      domain: [domainMin, domainMax],
      ticks: uniqueTicks,
      axisLine: true,
      tickLine: true,
      grid: false,
      tickFormatter: (value: number) => {
        if (showMax && value === maxRangeValue) {
          return `Max ${value.toFixed(1)}`;
        }
        if (showMin && value === minRangeValue) {
          return `Min ${value.toFixed(1)}`;
        }
        return value.toFixed(1);
      },
      showMin,
      showMax,
    };
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case "OPTIMAL":
        return "bg-green-50 text-green-700";
      case "HIGH":
        return "bg-red-50 text-red-700";
      case "LOW":
        return "bg-yellow-50 text-yellow-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const renderMarkerValue = (value: ParameterValue, index: number) => {
    // Find the report details to get client ID
    const report = data.reports.find((r) => r.id === value.reportId);
    const statusColorClass = getStatusColor(value.status);

    return (
      <div
        key={index}
        className={`p-4 rounded-lg ${statusColorClass} transition-colors duration-150`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">{report?.clientName}</span>
        </div>
        <div className="text-lg font-semibold">
          {value.value} {value.unit}
        </div>
        <div className="text-sm opacity-75">{formatDate(value.reportDate)}</div>
        {value.genderSpecificRange && (
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              <span className="font-medium">{value.status}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Optimal Range:</span>
              <span>
                {value.genderSpecificRange.min}-{value.genderSpecificRange.max}
              </span>
            </div>
          </div>
        )}
      </div>
    );
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
        </div>
        <h1 className="text-3xl font-bold text-gray-800">
          Multi-Client Comparison
        </h1>
      </div>

      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Reports Information</h2>
        <div className="space-y-4">
          {data.reports.map((report, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-white rounded-lg shadow-sm"
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
                <span className="font-medium">Report Date:</span>{" "}
                {formatDate(report.reportDate)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.panelComparisons.map((panel, index) => (
        <Card key={index} className="mb-8">
          <CardHeader className="bg-muted/50 border-b border-border py-4">
            <CardTitle>{panel.panelName}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {panel.bloodMarkerComparisons.map((comparison, idx) => {
                // Add parent data to each value for label access
                const valuesWithParent = comparison.values.map((value) => ({
                  ...value,
                  parentData: comparison.values,
                }));

                return (
                  <div key={idx} className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-4">
                      {comparison.parameterName}
                    </h3>

                    {comparison.values.length > 0 && (
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={comparison.values}
                            margin={{
                              top: 30,
                              right: 60,
                              left: 60,
                              bottom: 90,
                            }}
                          >
                            <XAxis
                              dataKey="reportDate"
                              tickFormatter={formatDate}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={0}
                              tickMargin={45}
                              stroke="#666"
                              fontSize={12}
                              padding={{ left: 30, right: 30 }} // Add padding to XAxis
                            />
                            {(() => {
                              const yAxisConfig = getYAxisConfig(
                                comparison.values
                              );
                              return (
                                <>
                                  <YAxis
                                    {...yAxisConfig}
                                    stroke="#666"
                                    fontSize={12}
                                    width={70}
                                    tickMargin={8}
                                  />
                                </>
                              );
                            })()}
                            <Line
                              type="linear"
                              dataKey="value"
                              stroke="none"
                              strokeWidth={0}
                              dot={<CustomizedDot />}
                              label={{
                                position: "top",
                                content: (props) => (
                                  <CustomizedLabel {...props} />
                                ),
                              }}
                              isAnimationActive={false}
                              connectNulls={true}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {comparison.values.map((value, vidx) =>
                        renderMarkerValue(value, vidx)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  );
};

export default MultiClientComparisonClient;
