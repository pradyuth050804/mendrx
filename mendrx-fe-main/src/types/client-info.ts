// File: src/types/client-info.ts
export interface ClientInfo {
    clientId: string;
    clientName: string;
    gender: string;
    age: number;
    height?: number;
    weight?: number;
    waist?: number;
    diet?: string;
    bmi?: string;
    lifestyleHabits?: string[];
    existingConditions?: string[];
  }