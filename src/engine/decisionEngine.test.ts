import { describe, it, expect, beforeEach } from 'vitest';
import { runAssessment } from './decisionEngine';
import type { BatteryRecord } from '../types';
import { getBatteries, addAssessment, resetDemoData } from '../lib/storage';

const getBaseBattery = (): BatteryRecord => ({
  id: 'TEST-001',
  manufacturer: 'TestMaker',
  model: 'TestModel',
  chemistry: 'NMC',
  manufactureDate: '2020-01-01',
  capacityAh: 100, // rated
  nominalVoltage: 400,
  cycleCount: 1000,
  lastReading: {
    timestamp: '2023-01-01T00:00:00Z',
    voltage: 380,
    current: 0,
    temperature: 25,
    stateOfCharge: 50,
    measuredCapacityAh: 85, // 85% SOH
    faultFlags: []
  },
  assessmentHistory: []
});

describe('Decision Engine - Core Logic', () => {
  it('1. Critical fault overrides high SOH', () => {
    const battery = getBaseBattery();
    battery.lastReading.faultFlags = ['THERMAL_RUNAWAY_RISK'];
    
    const result = runAssessment(battery);
    
    expect(result.healthScore).toBe(85); // High SOH
    expect(result.safetyStatus).toBe('Critical'); // But safety is Critical
    expect(result.recommendation).toBe('HOLD / INSPECTION'); // Overrides recommendation
  });

  it('2. A critical fault cannot be overwritten by a later application rule', () => {
    const battery = getBaseBattery();
    battery.lastReading.faultFlags = ['INSULATION_FAILURE'];
    battery.lastReading.measuredCapacityAh = 40; // Normally goes to recycle
    
    const result = runAssessment(battery);
    
    expect(result.recommendation).toBe('HOLD / INSPECTION');
    expect(result.potentialMatches.find(m => m.application === 'Recycle')?.isMatch).toBe(false);
  });

  it('3. Missing capacity does not fabricate SOH', () => {
    const battery = getBaseBattery();
    battery.lastReading.measuredCapacityAh = null;
    
    const result = runAssessment(battery);
    
    expect(result.healthScore).toBe(null);
    expect(result.dataCompleteness.hasValidCapacity).toBe(false);
  });

  it('4. Missing safety evidence does not become a safety pass', () => {
    const battery = getBaseBattery();
    battery.lastReading.temperature = null;
    
    const result = runAssessment(battery);
    
    // Safety status should not be 'Safe' when essential evidence is missing
    expect(result.safetyStatus).not.toBe('Safe');
    // For missing temp, it becomes 'Caution'
    expect(result.safetyStatus).toBe('Caution');
    expect(result.recommendation).toBe('HOLD / INSPECTION');
  });

  it('5. Invalid measurements cannot produce an approval', () => {
    const battery = getBaseBattery();
    battery.capacityAh = -100; // invalid rated capacity
    battery.lastReading.measuredCapacityAh = -85; // invalid measured capacity
    
    const result = runAssessment(battery);
    
    expect(result.healthScore).toBe(null);
    expect(result.recommendation).toBe('HOLD / INSPECTION');
  });

  it('6. Measured capacity above the accepted input range is rejected or explicitly flagged', () => {
    const battery = getBaseBattery();
    battery.lastReading.measuredCapacityAh = 150; // Implausible (150 > 110)
    
    const result = runAssessment(battery);
    
    expect(result.healthScore).toBe(null);
    expect(result.dataCompleteness.hasValidCapacity).toBe(false);
    expect(result.warnings.some(w => w.includes('implausible'))).toBe(true);
    expect(result.recommendation).toBe('HOLD / INSPECTION');
  });

  it('7. Missing application-specific evidence prevents unsupported approval', () => {
    // Automotive match requires Safe status, no faults, >=80% SOH.
    // Ensure that it lists outstandingRequirements instead of blank approval
    const battery = getBaseBattery();
    const result = runAssessment(battery);
    
    const autoMatch = result.potentialMatches.find(m => m.application === 'Continued Automotive Use');
    expect(autoMatch?.isMatch).toBe(true);
    expect(autoMatch?.outstandingRequirements.length).toBeGreaterThan(0);
    expect(autoMatch?.outstandingRequirements[0]).toContain('pack-level certification');
  });
});

// Since vitest doesn't have a real DOM/localStorage by default in a Node environment,
// we can mock localStorage globally for these tests.
describe('Shared State and Persistence', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      length: 0,
      key: (i: number) => Object.keys(store)[i] || null,
    } as Storage;
    
    resetDemoData(); // Populates SEED_BATTERIES into localStorage
  });

  it('8. Repeated assessments preserve history', () => {
    const batteries = getBatteries();
    const target = batteries[0];
    
    const res1 = runAssessment(target);
    addAssessment(target.id, res1);
    
    const res2 = runAssessment(target);
    addAssessment(target.id, res2);
    
    const updated = getBatteries().find(b => b.id === target.id);
    expect(updated?.assessmentHistory.length).toBe(2);
  });

  it('9. A new assessment does not erase older assessments', () => {
    const target = getBatteries()[0];
    
    const res1 = runAssessment(target);
    addAssessment(target.id, res1);
    
    const historyAfterOne = getBatteries().find(b => b.id === target.id)?.assessmentHistory;
    expect(historyAfterOne?.[0].id).toBe(res1.id);
    
    const res2 = runAssessment(target);
    addAssessment(target.id, res2);
    
    const historyAfterTwo = getBatteries().find(b => b.id === target.id)?.assessmentHistory;
    expect(historyAfterTwo?.[0].id).toBe(res2.id); // Newest is first
    expect(historyAfterTwo?.[1].id).toBe(res1.id); // Older is preserved
  });

  it('10. Reset behaviour is consistent', () => {
    const target = getBatteries()[0];
    addAssessment(target.id, runAssessment(target));
    
    expect(getBatteries()[0].assessmentHistory.length).toBe(1);
    
    resetDemoData();
    
    // History should be reset to empty (as per SEED_BATTERIES)
    expect(getBatteries()[0].assessmentHistory.length).toBe(0);
  });
});
