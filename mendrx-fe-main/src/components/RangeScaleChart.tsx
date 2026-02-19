// src/components/RangeScaleChart.tsx
import React from "react";

interface RangeScaleChartProps {
  value: number;
  units: string;
  minValue: number; // Functional min
  maxValue: number; // Functional max
  standardMinValue: number;
  standardMaxValue: number;
}

const RangeScaleChart: React.FC<RangeScaleChartProps> = ({
  value,
  units,
  minValue,
  maxValue,
  standardMinValue,
  standardMaxValue,
}) => {
  // Helper function to format numbers concisely for display on the chart axis/labels
  const formatAxisValue = (val: number): string => {
    // ... (implementation unchanged)
    if (val === 0) return "0";
    if (Math.abs(val) < 1 && Math.abs(val) > 0) return val.toFixed(1);
    if (Math.abs(val) >= 1000) return val.toExponential(0);
    return val.toFixed(Number.isInteger(val) ? 0 : 1);
  };

  // Determine the overall scale range needed
  // ... (scale calculation and padding unchanged)
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
  const coreRange = Math.max(...allPoints) - Math.min(...allPoints);
  const padding = coreRange * 0.15;
  scaleMin -= padding;
  scaleMax += padding;
  const totalScaleRange = scaleMax - scaleMin;

  // Function to calculate the percentage position from the left edge (0% to 100%)
  const getPositionPercent = (val: number): number => {
    // ... (implementation unchanged)
    if (totalScaleRange <= 0) return 50;
    const clampedVal = Math.max(scaleMin, Math.min(scaleMax, val));
    return ((clampedVal - scaleMin) / totalScaleRange) * 100;
  };

  // Calculate positions for ranges and the value marker
  const valuePos = getPositionPercent(value);
  const stdMinPos = getPositionPercent(standardMinValue);
  const stdMaxPos = getPositionPercent(standardMaxValue);
  const funcMinPos = getPositionPercent(minValue);
  const funcMaxPos = getPositionPercent(maxValue);

  // Clamp positions to 0-100% for styling safety
  const clampPercent = (num: number) => Math.max(0, Math.min(100, num));

  // Determine the width of the range bars
  const stdWidth = clampPercent(stdMaxPos) - clampPercent(stdMinPos);
  const funcWidth = clampPercent(funcMaxPos) - clampPercent(funcMinPos);

  // *** Determine Value Marker Color based on Functional Range ***
  const isOptimal = value >= minValue && value <= maxValue;
  const isStandard = value >= standardMinValue && value <= standardMaxValue;
  const isBorderlineOptimal = value === minValue || value === maxValue;
  const isBorderlineStandard =
    value === standardMinValue || value === standardMaxValue;

  let markerColorClass = "bg-red-600";
  let markerTextColorClass = "text-red-600";

  if (isOptimal && !isBorderlineOptimal) {
    markerColorClass = "bg-green-600";
    markerTextColorClass = "text-green-600";
  } else if (isBorderlineOptimal) {
    markerColorClass = "bg-amber-500";
    markerTextColorClass = "text-amber-500";
  } else if (isStandard && !isBorderlineStandard) {
    markerColorClass = "bg-amber-700";
    markerTextColorClass = "text-amber-700";
  } else if (isBorderlineStandard) {
    markerColorClass = "bg-red-600";
    markerTextColorClass = "text-red-600";
  }

  return (
    // Container div - increased height and padding-bottom for thicker bar + legend
    <div className="w-full px-2 pt-8 pb-6 relative h-[75px]">
      {" "}
      {/* Increased height + pb */}
      {/* Scale Track (background) - Made thicker */}
      <div className="h-2.5 bg-gray-100 rounded-full absolute bottom-6 left-0 right-0">
        {" "}
        {/* Thicker h-2.5, adjusted bottom */}
        {/* Standard Range Bar */}
        <div
          className="absolute h-full bg-amber-300 rounded-full" // Changed from bg-gray-300 to bg-amber-300
          style={{
            left: `${clampPercent(stdMinPos)}%`,
            width: `${Math.max(0, stdWidth)}%`,
          }}
          title={`Standard Range: ${standardMinValue} - ${standardMaxValue}`}
        />
        {/* Functional (Optimal) Range Bar */}
        <div
          className="absolute h-full bg-green-300 rounded-full border border-green-400" // Thicker bar inherits height
          style={{
            left: `${clampPercent(funcMinPos)}%`,
            width: `${Math.max(0, funcWidth)}%`,
          }}
          title={`Optimal Range: ${minValue} - ${maxValue}`}
        />
      </div>
      {/* Patient Value Marker (dot and label above) */}
      <div
        className="absolute"
        style={{
          left: `${clampPercent(valuePos)}%`,
          // Position marker vertically centered on the thicker bar (bar bottom is 24px, height 10px -> center at 29px from container bottom)
          // Marker height is 12px, so place marker bottom at 29px - 6px = 23px
          bottom: "23px",
          transform: "translateX(-50%)",
        }}
        title={`Your Value: ${value} ${units}`}
      >
        {/* Value dot marker - Color now dynamic */}
        <div
          className={`w-3 h-3 ${markerColorClass} rounded-full border-2 border-white shadow-md`}
        ></div>
        {/* Value label above the dot - Color now dynamic */}
      </div>
      {/* --- Labels Below the Bar --- */}
      {/* Standard Range Min/Max Labels (position adjusted slightly for thicker bar) */}
      <span
        className="absolute bottom-[8px] text-[10px] text-amber-500 whitespace-nowrap" // Changed from text-muted-foreground to text-amber-700
        style={{
          left: `${clampPercent(stdMinPos)}%`,
          transform: "translateX(-50%)",
        }}
      >
        {formatAxisValue(standardMinValue)}
      </span>
      <span
        className="absolute bottom-[8px] text-[10px] text-amber-500 whitespace-nowrap" // Changed from text-muted-foreground to text-amber-700
        style={{
          left: `${clampPercent(stdMaxPos)}%`,
          transform: "translateX(-50%)",
        }}
      >
        {formatAxisValue(standardMaxValue)}
      </span>
      {/* Optimal Range Min/Max Labels - Moved to top */}
      {Math.abs(funcMinPos - stdMinPos) >= 0 && (
        <span
          className="absolute bottom-[34px] text-[10px] text-green-700 whitespace-nowrap"
          style={{
            left: `${clampPercent(funcMinPos)}%`,
            transform: "translateX(-10%)",
          }}
        >
          {formatAxisValue(minValue)}
        </span>
      )}
      {Math.abs(funcMaxPos - stdMaxPos) >= 0 && (
        <span
          className="absolute bottom-[34px] text-[10px] text-green-700 whitespace-nowrap"
          style={{
            left: `${clampPercent(funcMaxPos)}%`,
            transform: "translateX(-10%)",
          }}
        >
          {formatAxisValue(maxValue)}
        </span>
      )}
      {/* --- Legend --- */}
      <div className="absolute bottom-[-8px] md:bottom-[-26px] left-0 right-0 flex justify-center items-center space-x-4 pt-1">
        <div className="flex items-center space-x-1">
          <div className="w-2.5 h-2.5 bg-amber-300 rounded-sm"></div>{" "}
          {/* Changed from bg-gray-300 to bg-amber-300 */}
          <span className="text-[10px] text-muted-foreground">
            Standard Range
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2.5 h-2.5 bg-green-300 border border-green-400 rounded-sm"></div>
          <span className="text-[10px] text-muted-foreground">
            Optimal Range
          </span>
        </div>
      </div>
    </div>
  );
};

export default RangeScaleChart;
