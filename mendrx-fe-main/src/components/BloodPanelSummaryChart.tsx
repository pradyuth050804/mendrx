// File: src/components/BloodPanelSummaryChart.tsx
import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
  Layer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const INNER_COLORS = {
  GOOD: "#4CAF50",
  FAIR: "#FFA726",
  POOR: "#E53935",
} as const;

const OUTER_COLORS = {
  OPTIMAL: "#81C784",
  HIGH: "#FF8A65",
  LOW: "#FFD54F",
} as const;

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

interface BloodPanel {
  name: string;
  healthScore: string;
  status: keyof typeof INNER_COLORS;
}

interface BloodPanelData {
  [key: string]: BloodMarker[];
}

interface PanelDataItem {
  name: string;
  value: number;
  status: keyof typeof INNER_COLORS;
  healthScore: string;
  startAngle: number;
  endAngle: number;
  iconName: string;
  deviatedMarkers: BloodMarker[];
  totalMarkers: number;
  markerCounts: {
    OPTIMAL: number;
    HIGH: number;
    LOW: number;
  };
}

interface MarkerSegment {
  type: keyof typeof OUTER_COLORS;
  value: number;
  panel: string;
  markerNames: string[];
  count: number;
  total: number;
}

interface RingData {
  panelIndex: number;
  startAngle: number;
  endAngle: number;
  segments: MarkerSegment[];
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload || !payload[0]) return null;
  const data = payload[0].payload;

  if ("status" in data) {
    // Inner chart tooltip
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <h4 className="font-bold mb-2">{data.name}</h4>
        <p className="mb-0">Status: {data.status}</p>
        <p className="mb-2">Health Score: {data.healthScore}</p>
        <div className="space-y-0">
          <p className="text-sm">
            Optimal Parameters: {data.markerCounts.OPTIMAL}
          </p>
          <p className="text-sm">High Parameters: {data.markerCounts.HIGH}</p>
          <p className="text-sm">Low Parameters: {data.markerCounts.LOW}</p>
        </div>
      </div>
    );
  } else {
    // Outer chart tooltip
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <h4 className="font-bold mb-2">
          {data.panel} - {data.type} Parameters
        </h4>
        <ul className="list-disc pl-4">
          {data.markerNames.map((name: string) => (
            <li key={name} className="text-sm">
              {name}
            </li>
          ))}
        </ul>
      </div>
    );
  }
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      opacity={0.9}
    />
  );
};

const BloodPanelSummaryChart: React.FC<{
  bloodPanelListMap: BloodPanelData;
}> = ({ bloodPanelListMap }) => {
  const [activeInnerIndex, setActiveInnerIndex] = useState<number | undefined>(
    undefined
  );
  const [activeOuterIndex, setActiveOuterIndex] = useState<
    | {
        ringIndex: number;
        segmentIndex: number;
      }
    | undefined
  >(undefined);

  const { panelData, outerRings, totalParameters, totalPanels } =
    useMemo(() => {
      const totalPanels = Object.keys(bloodPanelListMap).length;
      const paddingAngle = 1.5;
      const totalPadding = paddingAngle * totalPanels;
      const panelAngle = (360 - totalPadding) / totalPanels;

      // Calculate total parameters
      const totalParameters = Object.values(bloodPanelListMap).reduce(
        (sum, markers) => sum + markers.length,
        0
      );

      // Process inner circle data
      const panelData: PanelDataItem[] = Object.entries(bloodPanelListMap).map(
        ([key, markers], index) => {
          const panel: BloodPanel = JSON.parse(key);
          const startAngle = index * panelAngle + index * paddingAngle;
          const endAngle = startAngle + panelAngle;

          const markerCounts = markers.reduce(
            (acc, m) => {
              acc[m.result]++;
              return acc;
            },
            { OPTIMAL: 0, HIGH: 0, LOW: 0 } as Record<
              "OPTIMAL" | "HIGH" | "LOW",
              number
            >
          );

          return {
            name: panel.name,
            value: 1,
            status: panel.status,
            healthScore: panel.healthScore,
            startAngle,
            endAngle,
            iconName: panel.name.toLowerCase().replace(/\s+/g, "_"),
            deviatedMarkers: markers.filter((m) => m.result !== "OPTIMAL"),
            totalMarkers: markers.length,
            markerCounts,
          };
        }
      );

      // Process outer rings data
      const outerRings: RingData[] = Object.entries(bloodPanelListMap).map(
        ([key, markers], index) => {
          const panel = JSON.parse(key);
          const startAngle = index * panelAngle + index * paddingAngle;
          const endAngle = startAngle + panelAngle;

          const markersByType = markers.reduce((acc, m) => {
            if (!acc[m.result]) {
              acc[m.result] = [];
            }
            acc[m.result].push(m.parameterName);
            return acc;
          }, {} as Record<"OPTIMAL" | "HIGH" | "LOW", string[]>);

          const segments: MarkerSegment[] = [];
          Object.entries(markersByType).forEach(([result, names]) => {
            if (names.length > 0) {
              segments.push({
                type: result as keyof typeof OUTER_COLORS,
                value: names.length,
                panel: panel.name,
                markerNames: names,
                count: names.length,
                total: markers.length,
              });
            }
          });

          return {
            panelIndex: index,
            startAngle,
            endAngle,
            segments,
          };
        }
      );

      return { panelData, outerRings, totalParameters, totalPanels };
    }, [bloodPanelListMap]);

  const getOuterSegmentOpacity = (ringIndex: number, segmentIndex: number) => {
    if (activeOuterIndex) {
      if (activeOuterIndex.ringIndex === ringIndex) {
        return activeOuterIndex.segmentIndex === segmentIndex ? 1 : 0.3;
      }
      return 0.3;
    }

    if (activeInnerIndex !== undefined) {
      return activeInnerIndex === ringIndex ? 1 : 0.3;
    }

    return 1;
  };

  const { dividerAngles, debugAngles } = useMemo(() => {
    const totalPanels = Object.keys(bloodPanelListMap).length;
    const paddingAngle = 1.5;
    const totalPadding = paddingAngle * totalPanels;
    const panelAngle = (360 - totalPadding) / totalPanels;

    // Calculate angles for each panel's start, center, and end
    const angles = Array.from({ length: totalPanels }).map((_, index) => {
      const startAngle = index * (panelAngle + paddingAngle);
      const endAngle = startAngle + panelAngle;
      return {
        start: startAngle,
        center: startAngle + panelAngle / 2,
        end: endAngle,
        padding: endAngle + paddingAngle / 2,
      };
    });

    // Divider angles should be in the middle of the padding between panels
    const dividerAngles = angles.map((angle) => angle.padding);

    return { dividerAngles, debugAngles: angles };
  }, [bloodPanelListMap]);

  return (
    <Card className="w-full mt-8 mb-8">
      <CardHeader>
        <CardTitle>Blood Panel Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex">
          <div className="w-3/4 h-[550px] relative">
            <div className="h-[500px]">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-12 text-center z-10">
                <p className="text-base font-medium">
                  {totalParameters} parameters
                </p>
                <p className="text-base font-medium">
                  across {totalPanels} panels
                </p>
              </div>
              <svg
                className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                viewBox="0 0 500 500"
              >
                {dividerAngles.map((angle, index) => {
                  const centerX = 250;
                  const centerY = 227;
                  const innerRadius = 69;
                  const outerRadius = 190;
                  const radians = (angle * Math.PI) / 180;

                  const x1 = centerX + innerRadius * Math.cos(-radians);
                  const y1 = centerY + innerRadius * Math.sin(-radians);
                  const x2 = centerX + outerRadius * Math.cos(-radians);
                  const y2 = centerY + outerRadius * Math.sin(-radians);

                  return (
                    <line
                      key={`divider-${index}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#6B7280"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                  );
                })}
              </svg>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Inner circle for panel status */}
                  <Pie
                    data={panelData}
                    dataKey="value"
                    innerRadius="30%"
                    outerRadius="45%"
                    startAngle={0}
                    endAngle={360}
                    paddingAngle={2}
                    activeIndex={activeInnerIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => {
                      setActiveInnerIndex(index);
                      setActiveOuterIndex(undefined);
                    }}
                    onMouseLeave={() => setActiveInnerIndex(undefined)}
                  >
                    {panelData.map((entry, index) => (
                      <Cell
                        key={`inner-${index}`}
                        fill={INNER_COLORS[entry.status]}
                        opacity={
                          activeOuterIndex
                            ? activeOuterIndex.ringIndex === index
                              ? 1
                              : 0.3
                            : activeInnerIndex === undefined ||
                              activeInnerIndex === index
                            ? 1
                            : 0.3
                        }
                      />
                    ))}
                  </Pie>
                  {/* Outer rings */}
                  {outerRings.map((ring, ringIndex) => (
                    <Pie
                      key={`outer-ring-${ringIndex}`}
                      data={ring.segments}
                      dataKey="value"
                      innerRadius="50%"
                      outerRadius="70%"
                      startAngle={ring.startAngle}
                      endAngle={ring.endAngle}
                      paddingAngle={0}
                      activeIndex={
                        activeOuterIndex?.ringIndex === ringIndex
                          ? activeOuterIndex.segmentIndex
                          : undefined
                      }
                      onMouseEnter={(_, segmentIndex) => {
                        setActiveOuterIndex({ ringIndex, segmentIndex });
                        setActiveInnerIndex(ringIndex);
                      }}
                      onMouseLeave={() => {
                        setActiveOuterIndex(undefined);
                        setActiveInnerIndex(undefined);
                      }}
                    >
                      {ring.segments.map((segment, segmentIndex) => (
                        <Cell
                          key={`outer-${ringIndex}-${segmentIndex}`}
                          fill={OUTER_COLORS[segment.type]}
                          opacity={getOuterSegmentOpacity(
                            ringIndex,
                            segmentIndex
                          )}
                        />
                      ))}
                    </Pie>
                  ))}
                  <Tooltip
                    content={CustomTooltip}
                    wrapperStyle={{ zIndex: 10 }}
                    cursor={{ fill: "transparent" }}
                  />
                  {/* Panel icons */}
                  {panelData.map((entry, index) => {
                    const radius = 200;
                    const angle =
                      -1 *
                      ((entry.startAngle + entry.endAngle) / 2) *
                      (Math.PI / 180);
                    const x = Math.cos(angle) * radius + 315;
                    const y = Math.sin(angle) * radius + 247;

                    return (
                      <image
                        key={`icon-${index}`}
                        xlinkHref={`/${entry.iconName}.jpeg`}
                        x={x + 32}
                        y={y - 12}
                        height="32"
                        width="32"
                        style={{
                          filter:
                            activeInnerIndex === index ||
                            activeOuterIndex?.ringIndex === index
                              ? "brightness(1.2)"
                              : "none",
                        }}
                      />
                    );
                  })}
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4">
              <div className="flex justify-center gap-6">
                <p className="font-medium">Panel Status:</p>
                {Object.entries(INNER_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm">{status}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6">
                <p className="font-medium">Parameter Results:</p>
                {Object.entries(OUTER_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-1/4 pl-8 pt-16">
            <p className="font-medium mb-4">Panels:</p>
            <div className="space-y-0">
              {panelData.map((entry, index) => (
                <div
                  key={entry.name}
                  className={`flex items-center gap-3 p-2 rounded transition-opacity ${
                    activeInnerIndex === undefined ||
                    activeInnerIndex === index ||
                    activeOuterIndex?.ringIndex === index
                      ? "opacity-100"
                      : "opacity-50"
                  }`}
                  onMouseEnter={() => {
                    setActiveInnerIndex(index);
                    setActiveOuterIndex(undefined);
                  }}
                  onMouseLeave={() => {
                    setActiveInnerIndex(undefined);
                    setActiveOuterIndex(undefined);
                  }}
                >
                  <img
                    src={`/${entry.iconName}.jpeg`}
                    alt={entry.name}
                    className="w-6 h-6"
                  />
                  <span className="text-sm font-medium">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BloodPanelSummaryChart;
