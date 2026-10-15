import type { BatteryRecord } from '../types';

export const SEED_BATTERIES: BatteryRecord[] = [
  {
    id: 'BAT-2023-A01',
    manufacturer: 'Tesla',
    model: 'Model 3 LR Module',
    chemistry: 'NCA',
    manufactureDate: '2020-05-12',
    capacityAh: 230,
    nominalVoltage: 350,
    cycleCount: 1250,
    lastReading: {
      timestamp: new Date().toISOString(),
      voltage: 345.2,
      current: 12.5,
      temperature: 28,
      stateOfCharge: 78,
      measuredCapacityAh: 195,
      faultFlags: []
    },
    assessmentHistory: []
  },
  {
    id: 'BAT-2021-B42',
    manufacturer: 'Nissan',
    model: 'Leaf 40kWh Module',
    chemistry: 'LMO/NMC',
    manufactureDate: '2018-11-20',
    capacityAh: 110,
    nominalVoltage: 360,
    cycleCount: 2100,
    lastReading: {
      timestamp: new Date().toISOString(),
      voltage: 358.1,
      current: 0.0,
      temperature: 24,
      stateOfCharge: 55,
      measuredCapacityAh: 78,
      faultFlags: ['CELL_IMBALANCE_WARNING']
    },
    assessmentHistory: []
  },
  {
    id: 'BAT-2022-C15',
    manufacturer: 'LG Chem',
    model: 'E63',
    chemistry: 'NMC',
    manufactureDate: '2021-02-15',
    capacityAh: 63,
    nominalVoltage: 3.7,
    cycleCount: 450,
    lastReading: {
      timestamp: new Date().toISOString(),
      voltage: 3.8,
      current: 5.2,
      temperature: 30,
      stateOfCharge: 88,
      measuredCapacityAh: null, // Missing evidence example
      faultFlags: []
    },
    assessmentHistory: []
  },
  {
    id: 'BAT-2019-D99',
    manufacturer: 'BYD',
    model: 'Blade',
    chemistry: 'LFP',
    manufactureDate: '2019-08-30',
    capacityAh: 135,
    nominalVoltage: 3.2,
    cycleCount: 3500,
    lastReading: {
      timestamp: new Date().toISOString(),
      voltage: 2.9,
      current: 0,
      temperature: 55,
      stateOfCharge: 15,
      measuredCapacityAh: 90,
      faultFlags: ['THERMAL_RUNAWAY_RISK', 'OVER_TEMP_CRITICAL']
    },
    assessmentHistory: []
  }
];
