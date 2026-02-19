// File: src/components/ResultsTable.tsx
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface ParameterData {
  parameterName: string;
  value: string;
  units: string;
  parameterInfo: ParameterInfo;
}
interface ParameterInfo {
  minValue: number;
  maxValue: number;
}

interface UnitMismatch {
  parameterName: string;
  originalValue: string;
  originalUnit: string;
  convertedValue: string;
  convertedUnit: string;
}

interface ResultsTableProps {
  data: Record<string, ParameterData[]>;
  largelyDeviatedParams: string[];
  unitMismatches: UnitMismatch[];
  handleValueChange: (
    panelName: string,
    index: number,
    newValue: string
  ) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  largelyDeviatedParams,
  unitMismatches,
  handleValueChange,
}) => {
  // Create a map for quick lookup of unit mismatches
  const unitMismatchMap = React.useMemo(() => {
    const map = new Map<string, UnitMismatch>();
    unitMismatches.forEach((mismatch) => {
      map.set(mismatch.parameterName, mismatch);
    });
    return map;
  }, [unitMismatches]);
  return (
    <TooltipProvider>
      <div className="space-y-8">
      {Object.entries(data).map(([panelName, parameters]) => (
        <div key={panelName} className="rounded-lg border">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="text-lg font-semibold">{panelName}</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Parameter</TableHead>
                <TableHead className="w-[200px]">Value</TableHead>
                <TableHead className="w-[200px] text-center">Units</TableHead>
                <TableHead className="w-[200px] text-center">
                  Optimal Range
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.map((param, index) => (
                <TableRow key={`${panelName}-${param.parameterName}`}>
                  <TableCell
                    className={
                      largelyDeviatedParams.includes(param.parameterName) ||
                      unitMismatchMap.has(param.parameterName)
                        ? "bg-yellow-50 text-yellow-600 font-semibold"
                        : ""
                    }
                  >
                    <div className="flex items-center gap-2">
                      {param.parameterName}
                      {["Fatty Liver Index", "Viscosity", "Osmolarity"].includes(
                        param.parameterName
                      ) && " (Will be auto calculated in analysis)"}
                      {unitMismatchMap.has(param.parameterName) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-blue-600 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">Unit Conversion Applied</p>
                              <p className="text-sm">
                                Original: {unitMismatchMap.get(param.parameterName)?.originalValue}{" "}
                                {unitMismatchMap.get(param.parameterName)?.originalUnit}
                              </p>
                              <p className="text-sm">
                                Converted: {unitMismatchMap.get(param.parameterName)?.convertedValue}{" "}
                                {unitMismatchMap.get(param.parameterName)?.convertedUnit}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    className={
                      largelyDeviatedParams.includes(param.parameterName) ||
                      unitMismatchMap.has(param.parameterName)
                        ? "bg-yellow-50"
                        : ""
                    }
                  >
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) =>
                        handleValueChange(panelName, index, e.target.value)
                      }
                      className={
                        largelyDeviatedParams.includes(param.parameterName) ||
                        unitMismatchMap.has(param.parameterName)
                          ? "bg-yellow-50 w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          : "w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      }
                    />
                  </TableCell>
                  <TableCell
                    className={
                      largelyDeviatedParams.includes(param.parameterName) ||
                      unitMismatchMap.has(param.parameterName)
                        ? "bg-yellow-50 text-center"
                        : "text-center"
                    }
                  >
                    {param.units}
                  </TableCell>
                  <TableCell
                    className={
                      largelyDeviatedParams.includes(param.parameterName) ||
                      unitMismatchMap.has(param.parameterName)
                        ? "bg-yellow-50 text-center"
                        : "text-center"
                    }
                  >
                    {`${param.parameterInfo.minValue}-${param.parameterInfo.maxValue}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
      </div>
    </TooltipProvider>
  );
};

export default ResultsTable;
