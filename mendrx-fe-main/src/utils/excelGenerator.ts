// File: src/utils/excelGenerator.ts
import * as XLSX from 'xlsx'
import { calculateAgeAsOnReportDate } from './dateUtils';

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
  bloodPanelListMap: {
    [key: string]: BloodMarker[];
  };
  notes: string | null;
}

interface AnalysisResult {
  report: Report;
  consumedCredits: number;
  updatedCredits: number;
}

const SPECIAL_FORMAT_MAP: Record<string, string> = {
  'IBS': 'IBS',
  'IBD': 'IBD',
};

const DIET_FORMAT_MAP: Record<string, string> = {
  'NON_VEGETARIAN': 'Non-Vegetarian',
};

export type GenderType = 'male' | 'female' | 'other';

const GENDER_FORMAT_MAP: Record<GenderType, string> = {
  'male': 'Male',
  'female': 'Female',
  'other': 'Other'
};

function formatMarkdown(text: string | null): string {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\* /gm, '• ')
    .replace(/^(#+ .*$)/gm, '$1\n')
    .replace(/^# (.*$)/gm, '$1')
    .replace(/^## (.*$)/gm, '$1')
    .replace(/^### (.*$)/gm, '$1')
    .trim();
}

export function formatDiet(diet: string): string {
  if (!diet) return '';
  
  if (DIET_FORMAT_MAP[diet]) {
    return DIET_FORMAT_MAP[diet];
  }

  return diet
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.toLowerCase().slice(1))
    .join('-');
}

export function formatGender(gender: string): string {
  if (!gender) return '';
  
  return GENDER_FORMAT_MAP[gender as GenderType] || gender;
}

function formatDeviation(deviation: number): string {
  return deviation === 0 ? 'Borderline' : `${deviation}%`;
}

export function formatEnumValue(
  value: string, 
  options: { 
    preserveSlashes?: boolean;
    capitalize?: boolean;
  } = {}
): string {
  const { 
    preserveSlashes = true, 
    capitalize = true 
  } = options;

  if (!value) return '';

  if (preserveSlashes && SPECIAL_FORMAT_MAP[value]) {
    return SPECIAL_FORMAT_MAP[value];
  }

  const words = value.toLowerCase().split('_');
  
  if (capitalize) {
    return words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return words.join(' ');
}

const formatReasons = (reason: string | null | undefined): string => {
  if (!reason) return '-';
  return reason.toString()
    .split(/(?<=\.)\s+/)
    .filter(r => r.trim())
    .map(r => `• ${r.trim()}`)
    .join('\n');
};

const createBloodPanelSheet = (
  workbook: XLSX.WorkBook,
  panelName: string,
  panel: { name: string; healthScore: string; status: string },
  markers: BloodMarker[]
) => {
  // Separate deviated and optimal markers
  const deviatedMarkers = markers.filter(m => m.result !== "OPTIMAL");
  const optimalMarkers = markers.filter(m => m.result === "OPTIMAL");

  // Initialize data array for the sheet
  const sheetData: any[][] = [];

  // Add panel header
  sheetData.push([panel.name]);
  sheetData.push(['Health Score:', panel.healthScore, 'Status:', panel.status]);
  sheetData.push([]); // Empty row for spacing

  // Add deviated parameters section if any
  if (deviatedMarkers.length > 0) {
    sheetData.push(['Deviated Parameters']);
    sheetData.push(['Parameter Name', 'Value', 'Units', 'Result', 'Deviation', 'Possible Reasons']);

    deviatedMarkers.forEach(marker => {
      sheetData.push([
        marker.parameterName,
        marker.value,
        marker.units,
        marker.result,
        formatDeviation(marker.deviation),
        formatReasons(marker.reason)
      ]);
      sheetData.push([]); // Empty row for spacing
    });
  }

  // Add optimal parameters section if any
  if (optimalMarkers.length > 0) {
    sheetData.push(['Optimal Parameters']);
    sheetData.push(['Parameter', 'Value', 'Units']);

    optimalMarkers.forEach(marker => {
      sheetData.push([
        marker.parameterName,
        marker.value,
        marker.units
      ]);
    });
  }

  // Create the sheet
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  sheet['!cols'] = [
    { wch: 30 }, // Parameter Name
    { wch: 12 }, // Value
    { wch: 12 }, // Units
    { wch: 12 }, // Result
    { wch: 12 }, // Deviation
    { wch: 50 }  // Reasons
  ];

  // Style the header
  if (sheet['A1']) {
    sheet['A1'].s = { font: { bold: true, sz: 14 } };
  }

  // Add the sheet to workbook
  XLSX.utils.book_append_sheet(workbook, sheet, panelName);
};

export const generateExcel = (result: AnalysisResult): string => {
  const workbook = XLSX.utils.book_new();

  // Client Information Sheet
  const clientInfoData = [
    ['Client Information'],
    [],
    ['Client Name', result.report.client.name],
    ['Report Date', new Date(result.report.reportDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })],
    ['Gender', result.report.client.gender ? formatGender(result.report.client.gender) : 'N/A'],
    ['Age', calculateAgeAsOnReportDate(
      result.report.client.birthMonth,
      result.report.reportDate
    )],
    ['Height', result.report.height || 'N/A'],
    ['Weight', result.report.weight || 'N/A'],
    ['BMI', result.report.bmi || 'N/A'],
    ['Waist', result.report.waist || 'N/A'],
    ['Diet', result.report.diet ? formatDiet(result.report.diet) : 'N/A'],
    [
      'Lifestyle Habits', 
      result.report.lifestyleHabits?.length 
        ? result.report.lifestyleHabits
            .map(habit => formatEnumValue(habit))
            .join(", ") 
        : 'N/A'
    ],
    [
      'Known Conditions', 
      result.report.existingConditions?.length 
        ? result.report.existingConditions
            .map(condition => formatEnumValue(condition, { preserveSlashes: true }))
            .join(", ") 
        : 'N/A'
    ]
  ];
  const clientInfoSheet = XLSX.utils.aoa_to_sheet(clientInfoData);
  
  // Style the header
  if (clientInfoSheet['A1']) {
    clientInfoSheet['A1'].s = { font: { bold: true, sz: 14 } };
  }
  
  // Set column widths
  clientInfoSheet['!cols'] = [
    { wch: 20 }, // Labels
    { wch: 50 }  // Values
  ];
  
  XLSX.utils.book_append_sheet(workbook, clientInfoSheet, 'Client Information');

  // Create separate sheets for each blood panel
  Object.entries(result.report.bloodPanelListMap).forEach(([panelKey, markers], index) => {
    const panel = JSON.parse(panelKey);
    const sheetName = `Panel ${index + 1} - ${panel.name.slice(0, 20)}`; // Limit sheet name length
    createBloodPanelSheet(workbook, sheetName, panel, markers);
  });

  // Notes Sheet
  if (result.report.notes) {
    const formattedNotes = formatMarkdown(result.report.notes);
    const notesData = [
      ['Analysis Notes'],
      [],
      ...formattedNotes.split('\n').map(line => [line])
    ];
    const notesSheet = XLSX.utils.aoa_to_sheet(notesData);
    
    // Style the header
    if (notesSheet['A1']) {
      notesSheet['A1'].s = { font: { bold: true, sz: 14 } };
    }
    
    // Set column width for notes
    notesSheet['!cols'] = [{ wch: 100 }];
    
    XLSX.utils.book_append_sheet(workbook, notesSheet, 'Analysis Notes');
  }

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array',
    bookSST: false,
    compression: true
  });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  return url;
};