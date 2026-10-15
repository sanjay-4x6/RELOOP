import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { 
  QrCode as QrCodeIcon, 
  Download, 
  RefreshCw, 
  Info
} from 'lucide-react';
import type { BatteryRecord } from '../types';
import { getBatteries } from '../lib/storage';

export default function DigitalPassport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [batteries] = useState<BatteryRecord[]>(() => getBatteries());
  
  const paramId = searchParams.get('id') || searchParams.get('batteryId');
  const [internalSelectedId, setInternalSelectedId] = useState<string>(() => {
    const list = getBatteries();
    if (paramId && list.some(b => b.id === paramId)) {
      return paramId;
    }
    return list.length > 0 ? list[0].id : '';
  });

  const selectedId = (paramId && batteries.some(b => b.id === paramId)) ? paramId : internalSelectedId;
  const selectedBat = batteries.find(b => b.id === selectedId);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isQrGenerated, setIsQrGenerated] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // QR Code generator helper
  const generateQrForBattery = useCallback(async (bat: BatteryRecord) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const recordUrl = `${origin}/passport?id=${bat.id}`;
      const passportUrn = `urn:reloop:passport:${bat.id}`;
      // Encode a stable passport identifier and retrievable record reference without PDF bloat
      const qrPayload = `${recordUrl}#${passportUrn}`;

      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 180,
        margin: 2,
        color: {
          dark: '#0a0e17',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate battery passport QR code:', err);
    }
  }, []);

  // Handle battery selection change
  const handleBatteryChange = (newId: string) => {
    setInternalSelectedId(newId);
    setSearchParams({ id: newId }, { replace: true });
    
    // Automatically regenerate/update QR code if the QR section is currently active
    if (isQrGenerated) {
      const targetBat = batteries.find(b => b.id === newId);
      if (targetBat) {
        generateQrForBattery(targetBat);
      }
    }
  };

  // Trigger QR generation
  const handleGenerateQr = () => {
    if (!selectedBat) return;
    setIsQrGenerated(true);
    generateQrForBattery(selectedBat);
  };

  // PDF Generation function
  const handleDownloadPdf = useCallback(async () => {
    if (!selectedBat) return;
    setIsDownloadingPdf(true);
    const reportDate = new Date().toLocaleString();

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const margin = 16;
      const contentWidth = pageWidth - (margin * 2); // 178mm
      let y = 16;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > 275) {
          doc.addPage();
          y = 16;
        }
      };

      // Header Banner
      doc.setFillColor(18, 24, 38); // Dark Navy #121826
      doc.rect(margin, y, contentWidth, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(20, 184, 166); // Teal #14b8a6
      doc.text('RELOOP', margin + 6, y + 10);

      doc.setFontSize(11);
      doc.setTextColor(248, 250, 252);
      doc.text('// DIGITAL BATTERY PASSPORT', margin + 34, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Circular Lifecycle & Second-Life Intelligence Evaluation Report', margin + 6, y + 17);

      // Embedded QR Code on PDF header
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const qrPayload = `${origin}/passport?id=${selectedBat.id}#urn:reloop:passport:${selectedBat.id}`;
        const pdfQrData = await QRCode.toDataURL(qrPayload, {
          margin: 1,
          width: 100,
          color: { dark: '#000000', light: '#ffffff' }
        });
        doc.addImage(pdfQrData, 'PNG', pageWidth - margin - 22, y + 2, 20, 20);
      } catch (err) {
        console.error('Failed to embed QR code in PDF header:', err);
      }

      y += 28;

      // DEMO NOTICE / DISCLAIMER BANNER
      doc.setFillColor(254, 243, 199); // Soft amber bg
      doc.setDrawColor(245, 158, 11); // Amber border
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9); // Amber-700
      doc.text('DEMO ASSESSMENT REPORT — SIMULATED PROTOTYPE DATA', margin + 4, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(146, 64, 14);
      doc.text(
        'NOTICE: This document is generated for demonstration and evaluation purposes. All telemetry values and assessment findings are based on simulated or test-bench inputs and do NOT represent certified physical hardware lab testing.',
        margin + 4,
        y + 10,
        { maxWidth: contentWidth - 8 }
      );

      y += 18;

      // 1. BATTERY ASSET IDENTIFICATION
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('1. BATTERY ASSET IDENTIFICATION', margin, y);
      y += 2;
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;

      const col1X = margin;
      const col2X = margin + (contentWidth / 2);

      const drawRow = (label1: string, val1: string, label2: string, val2: string) => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(label1, col1X, y);
        doc.text(label2, col2X, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(val1, col1X + 38, y);
        doc.text(val2, col2X + 38, y);
        y += 5;
      };

      drawRow('Battery Asset ID:', selectedBat.id, 'Manufacturer:', selectedBat.manufacturer);
      drawRow('Model Name:', selectedBat.model, 'Cell Chemistry:', selectedBat.chemistry);
      drawRow('Rated Capacity:', `${selectedBat.capacityAh} Ah`, 'Nominal Voltage:', `${selectedBat.nominalVoltage} V`);
      drawRow('Cycle Count:', `${selectedBat.cycleCount} cycles`, 'Manufacture Date:', selectedBat.manufactureDate || 'Not specified');
      drawRow('Passport Identifier:', `urn:reloop:passport:${selectedBat.id}`, 'Report Date:', reportDate);

      y += 4;

      // 2. LATEST ASSESSMENT SUMMARY
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('2. LATEST ASSESSMENT SUMMARY', margin, y);
      y += 2;
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;

      const latest = selectedBat.assessmentHistory[0];

      if (!latest) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('No assessment records found for this battery. Run an assessment to generate evaluation findings.', margin, y);
        y += 8;
      } else {
        // Summary status card
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('SAFETY STATUS', margin + 6, y + 6);
        doc.text('ESTIMATED SOH', margin + 55, y + 6);
        doc.text('RECOMMENDED PATHWAY', margin + 105, y + 6);

        doc.setFontSize(10.5);
        if (latest.safetyStatus === 'Safe') doc.setTextColor(16, 185, 129);
        else if (latest.safetyStatus === 'Caution') doc.setTextColor(245, 158, 11);
        else doc.setTextColor(239, 68, 68);
        doc.text(latest.safetyStatus.toUpperCase(), margin + 6, y + 13);

        doc.setTextColor(15, 23, 42);
        doc.text(
          latest.healthScore !== null ? `${latest.healthScore.toFixed(1)}%` : 'N/A (Missing Capacity)',
          margin + 55,
          y + 13
        );

        doc.setTextColor(13, 148, 136);
        doc.text(latest.recommendation, margin + 105, y + 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Evaluation timestamp: ${new Date(latest.timestamp).toLocaleString()} (Assessment ID: ${latest.id})`, margin + 6, y + 19);

        y += 28;

        // Recommendation reasons
        if (latest.recommendationReasons.length > 0) {
          checkPageBreak(12);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text('Recommendation Rationale:', margin, y);
          y += 4.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          latest.recommendationReasons.forEach((r) => {
            checkPageBreak(5);
            doc.text(`• ${r}`, margin + 4, y);
            y += 4;
          });
          y += 2;
        }

        // Safety Warnings & Findings
        if (latest.warnings.length > 0) {
          checkPageBreak(12);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(220, 38, 38);
          doc.text('Safety Findings & Active Warnings:', margin, y);
          y += 4.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(185, 28, 28);
          latest.warnings.forEach((w) => {
            checkPageBreak(5);
            doc.text(`• [WARNING] ${w}`, margin + 4, y);
            y += 4;
          });
          y += 2;
        }

        // Missing Evidence & Further Tests
        if (latest.missingEvidence.length > 0 || latest.furtherTestsRequired.length > 0) {
          checkPageBreak(12);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(217, 119, 6);
          doc.text('Missing Evidence & Required Further Tests:', margin, y);
          y += 4.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(146, 64, 14);
          latest.missingEvidence.forEach((m) => {
            checkPageBreak(5);
            doc.text(`• Missing Evidence: ${m}`, margin + 4, y);
            y += 4;
          });
          latest.furtherTestsRequired.forEach((t) => {
            checkPageBreak(5);
            doc.text(`• Required Test: ${t}`, margin + 4, y);
            y += 4;
          });
          y += 2;
        }
      }

      y += 4;

      // 3. CHRONOLOGICAL ASSESSMENT HISTORY
      checkPageBreak(24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('3. CHRONOLOGICAL ASSESSMENT AUDIT HISTORY', margin, y);
      y += 2;
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;

      if (selectedBat.assessmentHistory.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('No historical assessments recorded for this battery asset.', margin, y);
        y += 8;
      } else {
        selectedBat.assessmentHistory.forEach((ass, index) => {
          checkPageBreak(28);

          doc.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 252 : 255);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(`#${index + 1} • ${new Date(ass.timestamp).toLocaleString()} • ID: ${ass.id}`, margin + 4, y + 5);

          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Status: `, margin + 4, y + 10);
          doc.setFont('helvetica', 'bold');
          if (ass.safetyStatus === 'Safe') doc.setTextColor(16, 185, 129);
          else if (ass.safetyStatus === 'Caution') doc.setTextColor(245, 158, 11);
          else doc.setTextColor(239, 68, 68);
          doc.text(ass.safetyStatus, margin + 16, y + 10);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`SOH: `, margin + 38, y + 10);
          doc.setTextColor(15, 23, 42);
          doc.text(ass.healthScore !== null ? `${ass.healthScore.toFixed(1)}%` : 'N/A', margin + 47, y + 10);

          doc.setTextColor(100, 116, 139);
          doc.text(`Recommendation: `, margin + 70, y + 10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(13, 148, 136);
          doc.text(ass.recommendation, margin + 98, y + 10);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(71, 85, 105);
          const warningsText = ass.warnings.length > 0 ? `Warnings: ${ass.warnings.join('; ')}` : 'No safety warnings recorded.';
          const testsText = ass.furtherTestsRequired.length > 0 ? `Required tests: ${ass.furtherTestsRequired.join('; ')}` : 'No pending tests.';
          doc.text(warningsText, margin + 4, y + 15, { maxWidth: contentWidth - 8 });
          doc.text(testsText, margin + 4, y + 20, { maxWidth: contentWidth - 8 });

          y += 28;
        });
      }

      // Page numbers & footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 285, margin + contentWidth, 285);
        doc.text(
          `RELOOP Circular Battery Platform • Asset: ${selectedBat.id} (${selectedBat.manufacturer} ${selectedBat.model}) • DEMO ASSESSMENT REPORT`,
          margin,
          290
        );
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 16, 290);
      }

      doc.save(`RELOOP_Passport_${selectedBat.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [selectedBat]);

  return (
    <div className="card">
      <h2 className="card-title">Digital Battery Passport</h2>
      
      <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Battery to View Passport</label>
        <select 
          value={selectedId} 
          onChange={(e) => handleBatteryChange(e.target.value)}
          style={{ width: '100%', padding: '8px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
        >
          {batteries.map(b => (
            <option key={b.id} value={b.id}>{b.id} - {b.manufacturer}</option>
          ))}
        </select>
      </div>

      {!selectedBat ? (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Please scan a battery barcode or select from the registry to view its passport.</p>
        </div>
      ) : (
        <div>
          {/* Battery Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Manufacturer</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedBat.manufacturer}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Model / Chemistry</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedBat.model} / {selectedBat.chemistry}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rated Capacity</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedBat.capacityAh} Ah</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Manufacture Date</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedBat.manufactureDate || 'N/A'}</div>
            </div>
          </div>

          {/* Assessment History */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--accent-teal-light)' }}>Assessment History</h3>
          
          {selectedBat.assessmentHistory.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No assessments recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedBat.assessmentHistory.map((ass) => (
                <div key={ass.id} style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{new Date(ass.timestamp).toLocaleString()}</strong>
                    <span className={`badge bg-${ass.safetyStatus.toLowerCase()} text-${ass.safetyStatus.toLowerCase()}`}>{ass.safetyStatus}</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>SOH: </span>
                      <span>{ass.healthScore !== null ? `${ass.healthScore.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Recommendation: </span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-teal-light)' }}>{ass.recommendation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Bar below Battery Details & Assessment History */}
          <div style={{ 
            marginTop: '28px', 
            paddingTop: '20px', 
            borderTop: '1px solid var(--border-color)', 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px', 
            alignItems: 'center' 
          }}>
            <button 
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 18px', 
                backgroundColor: 'var(--accent-teal)', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: 'var(--radius-sm)', 
                fontWeight: 600, 
                fontSize: '0.875rem', 
                cursor: isDownloadingPdf ? 'not-allowed' : 'pointer', 
                opacity: isDownloadingPdf ? 0.7 : 1,
                transition: 'background-color 0.2s' 
              }}
            >
              <Download size={16} />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            <button 
              onClick={handleGenerateQr}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 18px', 
                backgroundColor: 'var(--bg-tertiary)', 
                color: 'var(--accent-teal-light)', 
                border: '1px solid var(--accent-teal-dark)', 
                borderRadius: 'var(--radius-sm)', 
                fontWeight: 600, 
                fontSize: '0.875rem', 
                cursor: 'pointer', 
                transition: 'all 0.2s' 
              }}
            >
              <QrCodeIcon size={16} />
              <span>Generate QR Code</span>
            </button>
          </div>

          {/* Battery QR Code Section */}
          {isQrGenerated && qrDataUrl && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-teal-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <QrCodeIcon size={18} />
                    Battery QR Code
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Digital passport asset verification tag
                  </p>
                </div>
                <button 
                  onClick={handleGenerateQr}
                  title="Regenerate QR Code"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '6px 12px', 
                    fontSize: '0.75rem', 
                    backgroundColor: 'var(--bg-secondary)', 
                    color: 'var(--text-secondary)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)', 
                    cursor: 'pointer' 
                  }}
                >
                  <RefreshCw size={13} />
                  Regenerate
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
                {/* QR Image Box */}
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#ffffff', 
                  borderRadius: 'var(--radius-sm)', 
                  display: 'inline-block',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <img 
                    src={qrDataUrl} 
                    alt={`Digital Passport QR Code for ${selectedBat.id}`}
                    style={{ width: '150px', height: '150px', display: 'block' }}
                  />
                </div>

                {/* Details & Explanation */}
                <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Battery ID</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBat.id}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stable Passport URN</span>
                    <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--accent-teal-light)', wordBreak: 'break-all' }}>
                      urn:reloop:passport:{selectedBat.id}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Retrievable Record Reference</span>
                    <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                      {`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}/passport?id=${selectedBat.id}`}
                    </div>
                  </div>

                  {/* Localhost Demo Clarification */}
                  <div style={{ 
                    padding: '10px 12px', 
                    backgroundColor: 'rgba(15, 23, 42, 0.65)', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-color)', 
                    display: 'flex', 
                    gap: '10px', 
                    alignItems: 'flex-start' 
                  }}>
                    <Info size={16} style={{ color: 'var(--accent-teal-light)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                      <strong>Local Demo Record:</strong> This QR code encodes a stable passport URN identifier (<code style={{ color: 'var(--accent-teal-light)' }}>urn:reloop:passport:{selectedBat.id}</code>) and a local development record route. Because this prototype runs on a local environment (<code style={{ color: 'var(--text-primary)' }}>localhost</code>), this reference is retrievable within this development environment and is not accessible from external devices or public internet domains.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
