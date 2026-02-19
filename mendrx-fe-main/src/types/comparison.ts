// File: src/types/comparison.ts  
export interface ComparisonResponseModel {
    comparisonId: string;
    reports: ReportInfo[];
    panelComparisons: PanelComparison[];
    summary: ComparisonSummary | null;
  }

  // Define enums to match backend
export enum BloodPanelStatusEnum {
    GOOD = "GOOD",
    FAIR = "FAIR",
    POOR = "POOR",
  }
  
export enum BloodMarkerResultEnum {
    LOW = "LOW",
    OPTIMAL = "OPTIMAL",
    HIGH = "HIGH",
  }
  
export interface ReportInfo {
    id: string;
    clientId: string;
    clientName: string;
    updatedAt: string;
    reportDate: string;
    gender: string;
    age: number;
  }
  
export interface PanelComparison {
    panelName: string;
    status: BloodPanelStatusEnum;
    bloodMarkerComparisons: BloodMarkerComparison[];
  }
  
  export interface BloodMarkerComparison {
    parameterName: string;
    trend: TrendType | null;
    isPrimary: boolean;
    percentageChange: number | null;
    values: ParameterValue[];
    optimalRange: {
      min: number;
      max: number;
    };
  }
  
export interface ParameterValue {
    reportId: string;
    reportDate: string;
    value: number;
    unit: string;
    status: BloodMarkerResultEnum;
    genderSpecificRange: Range;
  }
  
export interface Range {
    min: number;
    max: number;
  }
  
export interface ComparisonSummary {
    totalParameters: number;
    improvingCount: number;
    deterioratingCount: number;
    consistentCount: number;
    persistentlyHighCount: number;
    persistentlyLowCount: number;
    fluctuatingCount: number;
    comparisonDate: string;
  }

  export enum TrendType {
    IMPROVING = "IMPROVING",
    DETERIORATING = "DETERIORATING",
    CONSISTENT = "CONSISTENT",
    PERSISTENTLY_HIGH = "PERSISTENTLY_HIGH",
    PERSISTENTLY_LOW = "PERSISTENTLY_LOW", 
    FLUCTUATING = "FLUCTUATING"
  }