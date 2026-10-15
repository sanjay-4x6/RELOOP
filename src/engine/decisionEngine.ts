import type { 
  BatteryRecord, 
  AssessmentResult, 
  ApplicationMatch, 
  RecommendationCategory,
  SafetyStatus
} from '../types';

function generateId(): string {
  return 'ASS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

const CRITICAL_FAULTS = ['THERMAL_RUNAWAY_RISK', 'OVER_TEMP_CRITICAL', 'SWELLING_DETECTED', 'INSULATION_FAILURE'];

export function runAssessment(battery: BatteryRecord): AssessmentResult {
  const reading = battery.lastReading;
  const warnings: string[] = [];
  const missingEvidence: string[] = [];
  const furtherTestsRequired: string[] = [];
  
  // 1. Data Completeness & Validation
  const isRatedCapacityValid = battery.capacityAh !== null && battery.capacityAh !== undefined && battery.capacityAh > 0;
  let hasValidCapacity = isRatedCapacityValid && reading.measuredCapacityAh !== null && reading.measuredCapacityAh !== undefined && reading.measuredCapacityAh > 0;
  
  if (!hasValidCapacity) {
    missingEvidence.push('Valid Measured Capacity (Ah) and positive Rated Capacity required');
    furtherTestsRequired.push('Full charge/discharge capacity test');
  } else if (reading.measuredCapacityAh! > battery.capacityAh * 1.1) {
    warnings.push('Measured capacity exceeds rated capacity significantly (implausible input).');
    hasValidCapacity = false; // Reject explicitly, don't just cap it silently
    missingEvidence.push('Plausible Capacity Measurement');
  }

  const hasVoltage = reading.voltage !== null && reading.voltage !== undefined;
  if (!hasVoltage) {
    missingEvidence.push('Voltage Measurement');
  }

  const hasTemperature = reading.temperature !== null && reading.temperature !== undefined;
  if (!hasTemperature) {
    missingEvidence.push('Temperature Measurement');
  }
  
  const issues = [...missingEvidence, ...warnings];

  // 2. Health Score Calculation
  let healthScore: number | null = null;
  if (hasValidCapacity) {
    healthScore = (reading.measuredCapacityAh! / battery.capacityAh) * 100;
  }

  // 3. Safety Evaluation
  let safetyStatus: SafetyStatus = 'Safe';
  const hasCriticalFault = reading.faultFlags.some(flag => CRITICAL_FAULTS.includes(flag));
  const hasAnyFault = reading.faultFlags.length > 0;

  if (hasCriticalFault) {
    safetyStatus = 'Critical';
    warnings.push('Critical safety faults detected. Do not operate.');
  } else if (hasAnyFault || (!hasTemperature && hasVoltage)) {
    safetyStatus = 'Caution';
  }

  if (safetyStatus === 'Safe' && missingEvidence.length > 0) {
    safetyStatus = 'Unknown';
    warnings.push('Cannot guarantee safety without complete measurement evidence.');
  }

  // 4. Application Matching
  const potentialMatches: ApplicationMatch[] = [];

  // Automotive
  const automotiveMatch: ApplicationMatch = {
    application: 'Continued Automotive Use',
    isMatch: false,
    reasons: [],
    outstandingRequirements: []
  };
  if (healthScore !== null && healthScore >= 80 && safetyStatus === 'Safe' && !hasAnyFault) {
    automotiveMatch.isMatch = true;
    automotiveMatch.reasons.push('High SOH (>= 80%)');
    automotiveMatch.reasons.push('No fault flags');
    automotiveMatch.outstandingRequirements.push('Requires pack-level certification and dynamic load testing for certified suitability (prototype threshold).');
  } else {
    if (healthScore === null) automotiveMatch.outstandingRequirements.push('Valid SOH required');
    else if (healthScore < 80) automotiveMatch.reasons.push(`SOH too low (${healthScore.toFixed(1)}%)`);
    if (hasAnyFault) automotiveMatch.reasons.push('Faults detected');
    if (safetyStatus !== 'Safe') automotiveMatch.reasons.push('Safety status must be Safe');
  }
  potentialMatches.push(automotiveMatch);

  // Stationary Storage
  const stationaryMatch: ApplicationMatch = {
    application: 'Stationary Energy Storage',
    isMatch: false,
    reasons: [],
    outstandingRequirements: []
  };
  if (healthScore !== null && healthScore >= 60 && safetyStatus !== 'Critical') {
    stationaryMatch.isMatch = true;
    stationaryMatch.reasons.push('Adequate SOH (>= 60%)');
    stationaryMatch.reasons.push('No critical safety faults');
    stationaryMatch.outstandingRequirements.push('Requires continuous discharge validation (prototype threshold).');
  } else {
    if (healthScore === null) stationaryMatch.outstandingRequirements.push('Valid SOH required');
    else if (healthScore < 60) stationaryMatch.reasons.push(`SOH too low (${healthScore.toFixed(1)}%)`);
    if (safetyStatus === 'Critical') stationaryMatch.reasons.push('Critical faults present');
  }
  potentialMatches.push(stationaryMatch);

  // Backup Power
  const backupMatch: ApplicationMatch = {
    application: 'Backup Power',
    isMatch: false,
    reasons: [],
    outstandingRequirements: []
  };
  if (healthScore !== null && healthScore >= 50 && safetyStatus !== 'Critical') {
    backupMatch.isMatch = true;
    backupMatch.reasons.push('Adequate SOH (>= 50%)');
    backupMatch.reasons.push('No critical safety faults');
    backupMatch.outstandingRequirements.push('Requires self-discharge monitoring over 30 days (prototype threshold).');
  } else {
    if (healthScore === null) backupMatch.outstandingRequirements.push('Valid SOH required');
    else if (healthScore < 50) backupMatch.reasons.push(`SOH too low (${healthScore.toFixed(1)}%)`);
    if (safetyStatus === 'Critical') backupMatch.reasons.push('Critical faults present');
  }
  potentialMatches.push(backupMatch);

  // Repair / Remanufacture
  const repairMatch: ApplicationMatch = {
    application: 'Repair/Remanufacture',
    isMatch: false,
    reasons: [],
    outstandingRequirements: []
  };
  if (hasAnyFault && !hasCriticalFault && healthScore !== null && healthScore >= 60) {
    repairMatch.isMatch = true;
    repairMatch.reasons.push('Non-critical faults present (can be repaired)');
    repairMatch.reasons.push('Base SOH remains viable');
    repairMatch.outstandingRequirements.push('Requires module-level diagnostic test (prototype threshold).');
  } else {
    if (!hasAnyFault) repairMatch.reasons.push('No faults to repair');
    if (hasCriticalFault) repairMatch.reasons.push('Critical faults prevent repair matching');
  }
  potentialMatches.push(repairMatch);

  // Recycle
  const recycleMatch: ApplicationMatch = {
    application: 'Recycle',
    isMatch: false,
    reasons: [],
    outstandingRequirements: []
  };
  if (healthScore !== null && healthScore < 50) {
    recycleMatch.isMatch = true;
    recycleMatch.reasons.push('End of life capacity');
  }
  if (hasCriticalFault) {
    recycleMatch.isMatch = false; // Cannot approve recycling directly on critical fault
    recycleMatch.reasons.push('Critical safety risks prevent direct recycling referral');
    recycleMatch.outstandingRequirements.push('Must pass hazardous handling inspection before recycling referral');
  }
  potentialMatches.push(recycleMatch);

  // 5. Final Recommendation
  let recommendation: RecommendationCategory = 'HOLD / INSPECTION';
  const recommendationReasons: string[] = [];

  if (hasCriticalFault) {
    recommendation = 'HOLD / INSPECTION';
    recommendationReasons.push('Critical faults require immediate quarantine and inspection.');
  } else if (!hasValidCapacity || missingEvidence.length > 0 || safetyStatus === 'Unknown') {
    recommendation = 'HOLD / INSPECTION';
    recommendationReasons.push('Missing essential evidence. Cannot approve for any application.');
  } else if (automotiveMatch.isMatch) {
    recommendation = 'Continued Automotive Use';
    recommendationReasons.push('Battery meets strict criteria for automotive lifecycle continuation.');
  } else if (repairMatch.isMatch) {
    recommendation = 'Repair/Remanufacture';
    recommendationReasons.push('Battery has good capacity but requires module replacement or balancing.');
  } else if (stationaryMatch.isMatch) {
    recommendation = 'Stationary Energy Storage';
    recommendationReasons.push('Capacity is degraded for automotive, but perfectly suited for grid storage.');
  } else if (backupMatch.isMatch) {
    recommendation = 'Backup Power';
    recommendationReasons.push('Low cycling requirements for backup power match current SOH.');
  } else if (recycleMatch.isMatch) {
    recommendation = 'Recycle';
    recommendationReasons.push('Battery has reached true end-of-life and materials should be recovered.');
  } else {
    recommendationReasons.push('No suitable matches found.');
  }

  return {
    id: generateId(),
    batteryId: battery.id,
    timestamp: new Date().toISOString(),
    dataCompleteness: {
      hasValidCapacity,
      hasVoltage,
      hasTemperature,
      issues
    },
    healthScore,
    safetyStatus,
    recommendation,
    recommendationReasons,
    potentialMatches,
    warnings,
    missingEvidence,
    furtherTestsRequired
  };
}
