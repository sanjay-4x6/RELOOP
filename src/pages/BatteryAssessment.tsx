import { useState, useEffect } from 'react';
import type { BatteryRecord, BatteryReading, AssessmentResult } from '../types';
import { getBatteries, addAssessment } from '../lib/storage';
import { runAssessment } from '../engine/decisionEngine';

export default function BatteryAssessment() {
  const [batteries, setBatteries] = useState<BatteryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  
  const [readingInput, setReadingInput] = useState<Partial<BatteryReading>>({});
  const [faultInput, setFaultInput] = useState<string>('');
  const [result, setResult] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    const data = getBatteries();
    setBatteries(data);
    if (data.length > 0) {
      handleSelect(data[0].id, data);
    }
  }, []);

  const handleSelect = (id: string, bats = batteries) => {
    setSelectedId(id);
    const bat = bats.find(b => b.id === id);
    if (bat) {
      setReadingInput({
        ...bat.lastReading
      });
      setFaultInput(bat.lastReading.faultFlags.join(', '));
      setResult(bat.assessmentHistory[0] || null);
    }
  };

  const handleRunAssessment = () => {
    const bat = batteries.find(b => b.id === selectedId);
    if (!bat) return;

    const faults = faultInput.split(',').map(f => f.trim()).filter(f => f.length > 0);
    
    const simulatedReading: BatteryReading = {
      timestamp: new Date().toISOString(),
      voltage: readingInput.voltage !== undefined ? Number(readingInput.voltage) || null : null,
      current: readingInput.current !== undefined ? Number(readingInput.current) || null : null,
      temperature: readingInput.temperature !== undefined ? Number(readingInput.temperature) || null : null,
      stateOfCharge: readingInput.stateOfCharge !== undefined ? Number(readingInput.stateOfCharge) || null : null,
      measuredCapacityAh: readingInput.measuredCapacityAh !== undefined ? Number(readingInput.measuredCapacityAh) || null : null,
      faultFlags: faults
    };

    const batteryToAssess = {
      ...bat,
      lastReading: simulatedReading
    };

    const newResult = runAssessment(batteryToAssess);
    setResult(newResult);
    
    // Persist
    addAssessment(bat.id, newResult, simulatedReading);
    setBatteries(getBatteries());
  };

  const selectedBat = batteries.find(b => b.id === selectedId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div className="card">
        <h2 className="card-title">Select Battery & Simulate Data</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Battery ID</label>
          <select 
            value={selectedId} 
            onChange={(e) => handleSelect(e.target.value)}
            style={{ width: '100%', padding: '8px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
          >
            {batteries.map(b => (
              <option key={b.id} value={b.id}>{b.id} - {b.manufacturer} ({b.capacityAh}Ah Rated)</option>
            ))}
          </select>
        </div>

        {selectedBat && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(13, 148, 136, 0.1)', border: '1px solid var(--accent-teal-dark)', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-teal-light)', marginBottom: '12px', textTransform: 'uppercase' }}>Simulation Inputs</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Measured Capacity (Ah)</label>
                <input 
                  type="number" 
                  value={readingInput.measuredCapacityAh || ''} 
                  onChange={e => setReadingInput({...readingInput, measuredCapacityAh: parseFloat(e.target.value)})}
                  style={{ width: '100%', padding: '6px', background: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-color)' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Voltage (V)</label>
                <input 
                  type="number" 
                  value={readingInput.voltage || ''} 
                  onChange={e => setReadingInput({...readingInput, voltage: parseFloat(e.target.value)})}
                  style={{ width: '100%', padding: '6px', background: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-color)' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Temperature (°C)</label>
                <input 
                  type="number" 
                  value={readingInput.temperature || ''} 
                  onChange={e => setReadingInput({...readingInput, temperature: parseFloat(e.target.value)})}
                  style={{ width: '100%', padding: '6px', background: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-color)' }} 
                />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fault Flags (comma separated)</label>
                <input 
                  type="text" 
                  value={faultInput} 
                  onChange={e => setFaultInput(e.target.value)}
                  placeholder="e.g. OVER_TEMP_CRITICAL"
                  style={{ width: '100%', padding: '6px', background: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-color)' }} 
                />
              </div>
            </div>

            <button 
              onClick={handleRunAssessment}
              style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: 'var(--accent-teal)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
            >
              Run Assessment Engine
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Assessment Result</h2>
        {!result ? (
          <p style={{ color: 'var(--text-secondary)' }}>Run an assessment to see results.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</div>
                <div className={`badge bg-${result.safetyStatus.toLowerCase()} text-${result.safetyStatus.toLowerCase()}`} style={{ fontSize: '1rem', marginTop: '4px' }}>
                  {result.safetyStatus}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Est. SOH</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {result.healthScore !== null ? `${result.healthScore.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Next Action</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{result.recommendation}</div>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {result.recommendationReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>

            {result.warnings.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--status-critical)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                <strong style={{ color: 'var(--status-critical)', fontSize: '0.875rem' }}>WARNINGS</strong>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--status-critical)' }}>
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {result.missingEvidence.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderLeft: '3px solid var(--status-caution)' }}>
                <strong style={{ color: 'var(--status-caution)', fontSize: '0.875rem' }}>MISSING EVIDENCE</strong>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {result.missingEvidence.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
