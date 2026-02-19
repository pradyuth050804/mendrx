// File: src/utils/sndExcelGenerator.ts
import * as XLSX from 'xlsx';
import { ClientInfo } from '@/types/client-info';
import { formatDiet, formatGender, formatEnumValue } from './formatters';

interface Supplement {
  name: string;
  purpose: string;
  timing: string;
  dosage: string;
  precautions: string;
  timingCategory: string;
  brandSuggestionsAndGuidelines: string;
}

interface DayPlan {
  day: string;
  preMorning: string;
  morning: string;
  midMorning: string;
  lunch: string;
  earlyEvening: string;
  night: string;
  bedtime: string;
}

interface SnDPlan {
  supplements: Supplement[];
  dietPlan: DayPlan[];
  supplementNotes?: string;
  dietNotes?: string;
  supplementsEnabled: boolean;
  dietPlanEnabled: boolean;
}

interface SNDExcelInput {
  plan: SnDPlan;
  clientInfo?: ClientInfo;
}

const createClientInfoSheet = (workbook: XLSX.WorkBook, clientInfo?: ClientInfo) => {
  if (!clientInfo) return;

  const clientInfoData = [
    ['Client Information'],
    [],
    ['Client ID', clientInfo.clientId],
    ['Gender', formatGender(clientInfo.gender)],
    ['Age', clientInfo.age],
    ['Height', clientInfo.height ? `${clientInfo.height} cm` : 'N/A'],
    ['Weight', clientInfo.weight ? `${clientInfo.weight} kg` : 'N/A'],
    ['BMI', clientInfo.bmi ? `${clientInfo.bmi}` : 'N/A'],
    ['Waist', clientInfo.waist ? `${clientInfo.waist} in` : 'N/A'],
    ['Diet', clientInfo.diet ? formatDiet(clientInfo.diet) : 'N/A'],
    [
      'Lifestyle Habits',
      clientInfo.lifestyleHabits?.length
        ? clientInfo.lifestyleHabits
            .map(habit => formatEnumValue(habit))
            .join(", ")
        : 'N/A'
    ],
    [
      'Known Conditions',
      clientInfo.existingConditions?.length
        ? clientInfo.existingConditions
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
};

const createSupplementsSheet = (workbook: XLSX.WorkBook, plan: SnDPlan) => {
  if (!plan.supplements.length) return; // Skip if no supplements

  // Create header rows
  const sheetData: any[][] = [
    ['Supplements'],
    [],
    [
      'Name', 
      'Purpose', 
      'Timing Category', 
      'Timing', 
      'Dosage', 
      'Precautions',
      'Brand Suggestions & Guidelines'
    ]
  ];

  // Add supplement data
  plan.supplements.forEach(supplement => {
    sheetData.push([
      supplement.name,
      supplement.purpose || 'Not specified',
      supplement.timingCategory || 'Not specified',
      supplement.timing || 'Not specified',
      supplement.dosage || 'Not specified',
      supplement.precautions || 'Not specified',
      supplement.brandSuggestionsAndGuidelines || 'Not specified'
    ]);
  });

  // Add notes if present
  if (plan.supplementNotes) {
    sheetData.push(
      [],
      ['Notes'],
      [plan.supplementNotes]
    );
  }

  const supplementsSheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Style the header
  if (supplementsSheet['A1']) {
    supplementsSheet['A1'].s = { font: { bold: true, sz: 14 } };
  }

  // Set column widths
  supplementsSheet['!cols'] = [
    { wch: 20 }, // Name
    { wch: 30 }, // Purpose
    { wch: 20 }, // Timing Category
    { wch: 20 }, // Timing
    { wch: 20 }, // Dosage
    { wch: 40 }, // Precautions
    { wch: 50 }  // Brand Suggestions & Guidelines
  ];

  XLSX.utils.book_append_sheet(workbook, supplementsSheet, 'Supplements');
};

const createDietPlanSheet = (workbook: XLSX.WorkBook, plan: SnDPlan) => {
  if (!plan.dietPlan.length) return; // Skip if no diet plan

  // Create header rows
  const sheetData: any[][] = [
    ['Diet Plan'],
    [],
    [
      'Day',
      'Pre-Morning',
      'Morning',
      'Mid-Morning',
      'Lunch',
      'Early Evening',
      'Night',
      'Bedtime'
    ]
  ];

  // Add diet plan data
  plan.dietPlan.forEach(day => {
    sheetData.push([
      day.day,
      day.preMorning || 'Not specified',
      day.morning || 'Not specified',
      day.midMorning || 'Not specified',
      day.lunch || 'Not specified',
      day.earlyEvening || 'Not specified',
      day.night || 'Not specified',
      day.bedtime || 'Not specified'
    ]);
  });

  // Add notes if present
  if (plan.dietNotes) {
    sheetData.push(
      [],
      ['Notes'],
      [plan.dietNotes]
    );
  }

  const dietPlanSheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Style the header
  if (dietPlanSheet['A1']) {
    dietPlanSheet['A1'].s = { font: { bold: true, sz: 14 } };
  }

  // Set column widths
  dietPlanSheet['!cols'] = [
    { wch: 8 },  // Day
    { wch: 30 }, // Pre-Morning
    { wch: 30 }, // Morning
    { wch: 30 }, // Mid-Morning
    { wch: 30 }, // Lunch
    { wch: 30 }, // Early Evening
    { wch: 30 }, // Night
    { wch: 30 }  // Bedtime
  ];

  XLSX.utils.book_append_sheet(workbook, dietPlanSheet, 'Diet Plan');
};

export const generateSNDExcel = (input: SNDExcelInput): string => {
  const workbook = XLSX.utils.book_new();

  // Create client information sheet if client info is available
  if (input.clientInfo) {
    createClientInfoSheet(workbook, input.clientInfo);
  }

  // Create supplements sheet if enabled
  if (input.plan.supplementsEnabled) {
    createSupplementsSheet(workbook, input.plan);
  }

  // Create diet plan sheet if enabled
  if (input.plan.dietPlanEnabled) {
    createDietPlanSheet(workbook, input.plan);
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

  return URL.createObjectURL(blob);
};