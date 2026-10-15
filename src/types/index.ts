export type SafetyStatus = 'Safe' | 'Caution' | 'Critical' | 'Unknown';

export type RecommendationCategory = 
  | 'Continued Automotive Use' 
  | 'Repair/Remanufacture' 
  | 'Stationary Energy Storage' 
  | 'Backup Power' 
  | 'HOLD / INSPECTION' 
  | 'Recycle';

export interface BatteryReading {
  timestamp: string;
  voltage: number | null; // Can be null to represent missing
  current: number | null;
  temperature: number | null;
  stateOfCharge: number | null;
  measuredCapacityAh?: number | null;
  faultFlags: string[]; // e.g., 'OVER_TEMP', 'UNDER_VOLTAGE', 'CELL_IMBALANCE'
}

export interface ApplicationMatch {
  application: RecommendationCategory;
  isMatch: boolean;
  reasons: string[];
  outstandingRequirements: string[];
}

export interface AssessmentResult {
  id: string;
  batteryId: string;
  timestamp: string;
  
  // Validation Findings
  dataCompleteness: {
    hasValidCapacity: boolean;
    hasVoltage: boolean;
    hasTemperature: boolean;
    issues: string[];
  };

  healthScore: number | null; // SOH 0-100, null if cannot be calculated
  safetyStatus: SafetyStatus;
  
  recommendation: RecommendationCategory;
  recommendationReasons: string[];
  
  potentialMatches: ApplicationMatch[];
  
  warnings: string[];
  missingEvidence: string[];
  furtherTestsRequired: string[];
}

export interface BatteryRecord {
  id: string;
  manufacturer: string;
  model: string;
  chemistry: string;
  manufactureDate: string;
  capacityAh: number; // Rated capacity
  nominalVoltage: number;
  cycleCount: number;
  lastReading: BatteryReading;
  assessmentHistory: AssessmentResult[];
}
