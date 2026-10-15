import { useState, useEffect } from 'react';
import type { BatteryRecord } from '../types';
import { getBatteries, resetDemoData } from '../lib/storage';

export default function IntelligenceConsole() {
  const [batteries, setBatteries] = useState<BatteryRecord[]>([]);

  useEffect(() => {
    setBatteries(getBatteries());
  }, []);

  const handleReset = () => {
    resetDemoData();
    setBatteries(getBatteries());
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title">System Overview</h2>
        <button 
          onClick={handleReset}
          style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
        >
          Reset Demo Data
        </button>
      </div>
      <p>Welcome to the RELOOP Intelligence Console.</p>
      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {batteries.map(battery => {
          const latestAss = battery.assessmentHistory[0];
          return (
            <div key={battery.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600 }}>{battery.id}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{battery.manufacturer} {battery.model}</div>
              
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Latest SOH:</span>
                <strong>{latestAss && latestAss.healthScore !== null ? `${latestAss.healthScore.toFixed(1)}%` : 'N/A'}</strong>
              </div>
              <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Status:</span>
                <span style={{ color: latestAss ? `var(--status-${latestAss.safetyStatus.toLowerCase()})` : 'var(--text-secondary)' }}>
                  {latestAss ? latestAss.safetyStatus : 'Untested'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
