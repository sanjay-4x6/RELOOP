import type { BatteryRecord, AssessmentResult } from '../types';
import { SEED_BATTERIES } from '../data/seed';

const STORAGE_KEY = 'reloop_batteries';

export function getBatteries(): BatteryRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [...SEED_BATTERIES];
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [...SEED_BATTERIES];
    
    return parsed;
  } catch (err) {
    console.error('Failed to parse battery data from localStorage', err);
    return [...SEED_BATTERIES];
  }
}

export function saveBatteries(batteries: BatteryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batteries));
  } catch (err) {
    console.error('Failed to save battery data', err);
  }
}

export function addAssessment(batteryId: string, assessment: AssessmentResult, newReading?: any): void {
  const batteries = getBatteries();
  const batteryIndex = batteries.findIndex(b => b.id === batteryId);
  
  if (batteryIndex >= 0) {
    // Keep history at top
    batteries[batteryIndex].assessmentHistory.unshift(assessment);
    if (newReading) {
      batteries[batteryIndex].lastReading = newReading;
    }
    saveBatteries(batteries);
  }
}

export function resetDemoData(): void {
  saveBatteries([...SEED_BATTERIES]);
}
