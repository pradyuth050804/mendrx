// File: src/utils/formatters.ts

const SPECIAL_FORMAT_MAP: Record<string, string> = {
    'ACIDITY_GERD': 'Acidity/GERD',
    'DEPRESSION_ANXIETY': 'Depression/Anxiety',
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