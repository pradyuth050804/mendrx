// File: src/components/BloodPanelDisplay.tsx
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2 } from "lucide-react";
import RangeScaleChart from "@/components/RangeScaleChart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useParameterComments } from "@/contexts/ParameterCommentsContext";

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

interface BloodMarker {
  parameterName: string;
  value: string;
  units: string;
  result: "OPTIMAL" | "HIGH" | "LOW";
  deviation: number;
  reason: string;
  parameterInfo: ParameterInfo;
}

interface BloodPanel {
  name: string;
  healthScore: string;
  status: string;
}

interface BloodPanelDisplayProps {
  bloodPanelListMap: {
    [key: string]: BloodMarker[];
  };
  reportId: string;
  onReasonEdit: (
    parameterName: string,
    newReason: string,
    reportId: string
  ) => Promise<void>;
}

interface GaugeChartProps {
  deviation: number;
  result: "OPTIMAL" | "HIGH" | "LOW";
  minValue: number;
  maxValue: number;
  units?: string;
}

interface EditState {
  isEditing: boolean;
  editedReason: string;
  parameterName: string;
}

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

const GaugeChart: React.FC<GaugeChartProps> = ({
  deviation,
  result,
  minValue,
  maxValue,
  units,
}) => {
  const clampedDeviation = Math.min(Math.abs(deviation), 100);
  const data = [
    { name: "low", value: 33.33 },
    { name: "optimal", value: 33.34 },
    { name: "high", value: 33.33 },
  ];

  const COLORS = ["#FFD700", "#90EE90", "#FF6347"];
  const needleColor = result === "OPTIMAL" ? "#4CAF50" : "#f44336";

  const chartWidth = 192;
  const chartHeight = 148;
  const centerX = 10 + chartWidth / 2;
  const centerY = chartHeight * 0.75 - 40;
  const needleCircleOuterRadius = 5;
  const needleCircleInnerRadius = 3;
  const gaugeOuterRadius = 55;
  const gaugeInnerRadius = 40;

  const leftIntersectionX = centerX - gaugeOuterRadius * 0.86602540378; // cos(30°) ≈ 0.86602540378
  const rightIntersectionX = centerX + gaugeOuterRadius * 0.86602540378;
  const intersectionY = centerY - gaugeOuterRadius * 0.5;

  const formatValue = (value: number) => {
    if (value === 0) return "0"; // Special case for zero
    if (Math.abs(value) < 0.01) return value.toExponential(1);
    if (Math.abs(value) >= 1000) return value.toExponential(1);
    return value.toFixed(1);
  };

  const calculateNeedleAngle = () => {
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

  const getBorderlineText = () => {
    if (clampedDeviation === 0) {
      if (result === "HIGH") return "Borderline High";
      if (result === "LOW") return "Borderline Low";
    } else {
      if (result === "HIGH") return "High";
      if (result === "LOW") return "Low";
    }
    return null;
  };

  return (
    <div className="relative w-42 h-32">
      <PieChart width={chartWidth} height={chartHeight}>
        <Pie
          data={data}
          cx={centerX}
          cy={centerY}
          startAngle={180}
          endAngle={0}
          innerRadius={gaugeInnerRadius}
          outerRadius={gaugeOuterRadius}
          paddingAngle={0}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />
          ))}
        </Pie>

        <text
          x={leftIntersectionX + 18}
          y={intersectionY - 18}
          textAnchor="middle"
          fill="#666"
          fontSize="10"
          className="font-medium"
        >
          {formatValue(minValue)}
        </text>

        <text
          x={rightIntersectionX - 6}
          y={intersectionY - 18}
          textAnchor="middle"
          fill="#666"
          fontSize="10"
          className="font-medium"
        >
          {formatValue(maxValue)}
        </text>

        <text
          x={centerX - gaugeOuterRadius + needleCircleOuterRadius}
          y={centerY - centerY / 4 - 10}
          textAnchor="middle"
          fill="#666"
          fontSize="12"
          fontWeight="bold"
        >
          L
        </text>
        <text
          x={centerX + needleCircleOuterRadius}
          y={centerY / 2 - 20}
          textAnchor="middle"
          fill="#666"
          fontSize="12"
          fontWeight="bold"
        >
          O
        </text>
        <text
          x={centerX + gaugeOuterRadius + needleCircleOuterRadius}
          y={centerY - centerY / 4 - 10}
          textAnchor="middle"
          fill="#666"
          fontSize="12"
          fontWeight="bold"
        >
          H
        </text>

        <g
          transform={`translate(${centerX + needleCircleOuterRadius}, ${
            centerY + needleCircleOuterRadius
          })`}
        >
          <line
            y2={-36}
            stroke={needleColor}
            strokeWidth={3}
            strokeLinecap="round"
            transform={`rotate(${calculateNeedleAngle()})`}
            style={{
              transformOrigin: "0px 0px",
              transition: "transform 0.5s ease-out",
            }}
          />
          <circle r={needleCircleOuterRadius} fill={needleColor} />
          <circle r={needleCircleInnerRadius} fill="#fff" />
        </g>

        <text
          x={centerX + needleCircleOuterRadius}
          y={chartHeight - 52}
          textAnchor="middle"
          fill="#666"
          fontSize="14"
          className="font-medium"
        >
          Deviation: {deviation}%
        </text>

        {getBorderlineText() && (
          <text
            x={centerX + needleCircleOuterRadius}
            y={chartHeight + 1 - 40}
            textAnchor="middle"
            fill="#CA8A04"
            fontSize="10"
            className="font-medium"
          >
            {getBorderlineText()}
          </text>
        )}
      </PieChart>
    </div>
  );
};

const BloodPanelDisplay: React.FC<BloodPanelDisplayProps> = ({
  bloodPanelListMap,
  reportId,
  onReasonEdit,
}) => {
  const {
    parameterComments,
    isLoading: commentsLoading,
    error: commentsError,
  } = useParameterComments();
  const [editState, setEditState] = useState<EditState>({
    isEditing: false,
    editedReason: "",
    parameterName: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Add useEffect to log comments state for debugging
  useEffect(() => {}, [parameterComments, commentsLoading, commentsError]);

  const renderDeviatedParameter = (marker: BloodMarker) => {
    const numericValue = parseFloat(marker.value);
    const isValueNumeric = !isNaN(numericValue);

    // Check if parameter details and standard ranges exist
    const hasDetails = marker.parameterInfo;
    const hasStandardRange =
      hasDetails &&
      typeof marker.parameterInfo.standardMinValue === "number" &&
      typeof marker.parameterInfo.standardMaxValue === "number";
    const hasFunctionalRange =
      hasDetails &&
      typeof marker.parameterInfo.minValue === "number" &&
      typeof marker.parameterInfo.maxValue === "number";

    // Determine if we can render the charts
    const canRenderRangeScale =
      isValueNumeric && hasStandardRange && hasFunctionalRange;
    const canRenderGauge = isValueNumeric && hasFunctionalRange;
    const tooltipContent =
      marker.result === "HIGH"
        ? parameterComments?.highParameterComments[marker.parameterName]
        : parameterComments?.lowParameterComments[marker.parameterName];
    const handleEditClick = () => {
      setEditState({
        isEditing: true,
        editedReason: marker.reason,
        parameterName: marker.parameterName,
      });
    };

    const handleSaveClick = async () => {
      if (!onReasonEdit) return;
      setIsUpdating(true);
      try {
        await onReasonEdit(
          editState.parameterName,
          editState.editedReason,
          reportId
        );
        // Update the marker's reason in the local state
        marker.reason = editState.editedReason;
      } catch (error) {
        console.error("Error updating reason:", error);
      } finally {
        setIsUpdating(false);
        setEditState({ isEditing: false, editedReason: "", parameterName: "" });
      }
    };

    const handleCancelClick = () => {
      setEditState({ isEditing: false, editedReason: "", parameterName: "" });
    };
    return (
      <div key={marker.parameterName} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1.1fr_1.6fr_2fr] gap-x-4 gap-y-6 md:gap-x-1">
          <div className="md:pl-6">
            <h3 className="text-xl font-semibold">{marker.parameterName}</h3>
            {marker.parameterInfo?.shortDescription && (
              <p className="hidden md:block text-sm text-muted-foreground mt-1">
                {marker.parameterInfo.shortDescription}
              </p>
            )}
          </div>

          {/* --- Column 2: Value & Range Scale Chart --- */}
          <div className="flex-col items-center text-center">
            {/* Displayed Value Text */}
            <div className="text-lg mb-1">
              {" "}
              {/* Reduced margin */}
              <span className="font-medium">{marker.value}</span>{" "}
              <span className="text-muted-foreground">{marker.units}</span>
            </div>

            {/* *** RENDER RangeScaleChart *** */}
            <div className="ml-0">
              {canRenderRangeScale ? (
                <RangeScaleChart
                  value={numericValue}
                  units={marker.units}
                  minValue={marker.parameterInfo.minValue}
                  maxValue={marker.parameterInfo.maxValue}
                  standardMinValue={marker.parameterInfo.standardMinValue}
                  standardMaxValue={marker.parameterInfo.standardMaxValue}
                />
              ) : (
                // Optional: Placeholder or message if chart can't be rendered
                <div className="h-[60px] flex items-center justify-center text-xs text-muted-foreground">
                  (Range visualization not available)
                </div>
              )}
            </div>
          </div>

          {/* Gauge Chart Column */}
          <div className="flex  justify-center mt-6">
            {canRenderGauge ? (
              <GaugeChart
                deviation={marker.deviation}
                result={marker.result}
                minValue={marker.parameterInfo.minValue}
                maxValue={marker.parameterInfo.maxValue}
                units={marker.units}
              />
            ) : (
              <div className="w-48 h-32 flex items-center justify-center text-xs text-muted-foreground">
                (Gauge not available)
              </div>
            )}
            {commentsLoading ? (
              <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
            ) : tooltipContent ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-5 w-5 text-muted-foreground hover:text-foreground transition-color" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="text-sm whitespace-pre-line">
                      {tooltipContent?.split("\n").map((line, index) => (
                        <React.Fragment key={index}>
                          {line.trim() && (
                            <p className="mb-1 last:mb-0">{line.trim()}</p>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>

          {/* Possible Reasons Column */}
          {marker.reason ? (
            <div className="bg-muted/50 rounded-lg p-4 h-fit">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Possible Reasons:</h4>
                {editState.isEditing &&
                editState.parameterName === marker.parameterName ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelClick}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveClick}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditClick}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {editState.isEditing &&
              editState.parameterName === marker.parameterName ? (
                <Textarea
                  value={editState.editedReason}
                  onChange={(e) =>
                    setEditState((prev) => ({
                      ...prev,
                      editedReason: e.target.value,
                    }))
                  }
                  className="min-h-[100px]"
                  placeholder="Enter possible reasons..."
                />
              ) : (
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {marker.reason
                    .split(/(?<=\.)\s+/)
                    .filter((reason) => reason.trim())
                    .map((reason, idx) => (
                      <li key={idx}>{reason.trim()}</li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <div /> // Empty div to maintain grid structure when no reason is provided
          )}
        </div>
        <div className="mt-6 border-b border-border" />
      </div>
    );
  };

  const renderOptimalParameters = (markers: BloodMarker[]) => {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Optimal Parameters</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Parameter</th>
                <th className="text-left py-3 px-4 font-medium">Value</th>
                <th className="text-left py-3 px-4 font-medium">Units</th>
              </tr>
            </thead>
            <tbody>
              {markers.map((marker) => (
                <tr
                  key={marker.parameterName}
                  className="border-b border-border"
                >
                  <td className="py-3 px-4">{marker.parameterName}</td>
                  <td className="py-3 px-4">{marker.value}</td>
                  <td className="py-3 px-4">{marker.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {Object.entries(bloodPanelListMap).map(([panelKey, markers]) => {
        let panel: BloodPanel;
        try {
          panel = JSON.parse(panelKey);
        } catch (error) {
          console.error("Error parsing panel key:", error);
          return null;
        }

        const deviatedMarkers = markers.filter((m) => m.result !== "OPTIMAL");
        const optimalMarkers = markers.filter((m) => m.result === "OPTIMAL");
        const statusColor = getStatusColor(panel.status);

        return (
          <Card key={panel.name}>
            <CardHeader className="bg-muted/50 border-b border-border py-3">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                <CardTitle>
                  {panel.name}:{" "}
                  <span style={{ color: statusColor }}>{panel.status}</span>
                </CardTitle>
                <div className="flex flex-col md:flex-row md:space-x-6 text-sm text-muted-foreground">
                  <span>Health Score: {panel.healthScore}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {deviatedMarkers.map(renderDeviatedParameter)}
              {optimalMarkers.length > 0 &&
                renderOptimalParameters(optimalMarkers)}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BloodPanelDisplay;
