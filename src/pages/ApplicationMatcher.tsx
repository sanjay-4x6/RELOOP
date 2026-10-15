import { useState, useEffect } from 'react';
import type { BatteryRecord } from '../types';
import { getBatteries } from '../lib/storage';

export default function ApplicationMatcher() {
  const [batteries, setBatteries] = useState<BatteryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    const data = getBatteries();
    setBatteries(data);
    if (data.length > 0) {
      setSelectedId(data[0].id);
    }
  }, []);

  const selectedBat = batteries.find(b => b.id === selectedId);
  const latestAssessment = selectedBat?.assessmentHistory?.[0];

  return (
    <div className="card">
      <h2 className="card-title">Application Matcher</h2>
      
      <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Battery to View Matches</label>
        <select 
          value={selectedId} 
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ width: '100%', padding: '8px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
        >
          {batteries.map(b => (
            <option key={b.id} value={b.id}>{b.id} - {b.manufacturer}</option>
          ))}
        </select>
      </div>

      {!latestAssessment ? (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No assessment history found for this battery. Run an assessment first.</p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Top Recommendation: </span>
              <strong style={{ color: 'var(--accent-teal-light)' }}>{latestAssessment.recommendation}</strong>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {latestAssessment.potentialMatches.map((match, idx) => (
              <div key={idx} style={{ 
                padding: '16px', 
                backgroundColor: 'var(--bg-primary)', 
                border: `1px solid ${match.isMatch ? 'var(--accent-teal)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <strong style={{ color: match.isMatch ? 'var(--accent-teal-light)' : 'var(--text-primary)' }}>
                    {match.application}
                  </strong>
                  {match.isMatch ? (
                    <span className="badge bg-safe text-safe">MATCH</span>
                  ) : (
                    <span className="badge bg-tertiary text-secondary" style={{ backgroundColor: 'var(--bg-secondary)' }}>NO MATCH</span>
                  )}
                </div>

                <div style={{ fontSize: '0.875rem' }}>
                  {match.reasons.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Reasons:</span>
                      <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', color: match.isMatch ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {match.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {match.outstandingRequirements.length > 0 && (
                    <div>
                      <span style={{ color: 'var(--status-caution)' }}>Missing Requirements:</span>
                      <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', color: 'var(--status-caution)' }}>
                        {match.outstandingRequirements.map((req, i) => <li key={i}>{req}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
