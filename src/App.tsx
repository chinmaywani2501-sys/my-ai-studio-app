/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ComplianceReport,
  ExtractedPackageData,
  BenchmarkSample,
  DetectedTextRegion,
  SupportedLanguage
} from './types/legalMetrology';
import {
  extractDataFromText,
  evaluateLmpcCompliance
} from './utils/lmpcRuleEngine';
import { performOfflineOcr } from './utils/offlineOcr';
import { BENCHMARK_COMMODITY_SAMPLES } from './utils/sampleCommodities';
import { ScannerHeader } from './components/ScannerHeader';
import { LabelVisualizer } from './components/LabelVisualizer';
import { ComplianceScorecard } from './components/ComplianceScorecard';
import { PenaltyCalculator } from './components/PenaltyCalculator';
import { RawOcrViewer } from './components/RawOcrViewer';
import { OfficialNoticeModal } from './components/OfficialNoticeModal';
import { ManualCorrectionDrawer } from './components/ManualCorrectionDrawer';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { TRANSLATIONS } from './utils/translations';
import {
  UploadCloud,
  Camera,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  BookOpen,
  Info
} from 'lucide-react';

export default function App() {
  // App State
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [ocrLanguage, setOcrLanguage] = useState<string>('eng+hin');
  const [currentImage, setCurrentImage] = useState<string>(BENCHMARK_COMMODITY_SAMPLES[0].imageSrc);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'OFFLINE_TESSERACT' | 'AI_GEMINI_MULTIMODAL'>('OFFLINE_TESSERACT');
  const [selectedSampleId, setSelectedSampleId] = useState<string>(BENCHMARK_COMMODITY_SAMPLES[0].id);

  // Processing status
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<{ status: string; progress: number }>({
    status: 'Ready',
    progress: 0
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Interactive selection
  const [selectedRegionId, setSelectedRegionId] = useState<string | undefined>(undefined);
  const [selectedRuleId, setSelectedRuleId] = useState<string | undefined>(undefined);

  // Modals & Drawers
  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(false);
  const [isManualEditOpen, setIsManualEditOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Run initial evaluation for sample 1 on load
  useEffect(() => {
    const initialSample = BENCHMARK_COMMODITY_SAMPLES[0];
    const initialExtracted = extractDataFromText(initialSample.ocrText);
    const initialReport = evaluateLmpcCompliance(
      { ...initialExtracted, ...(initialSample.extractedData as ExtractedPackageData) },
      initialSample.ocrText,
      95
    );
    setReport(initialReport);
  }, []);

  /**
   * Main Pipeline to analyze an image either via Offline OCR (Tesseract.js)
   * or via AI Multimodal API (Gemini 3.8-Flash).
   */
  const processImageForCompliance = async (
    imageSrc: string,
    forcedMode?: 'OFFLINE_TESSERACT' | 'AI_GEMINI_MULTIMODAL'
  ) => {
    setIsProcessing(true);
    const activeMode = forcedMode || analysisMode;
    setProgressInfo({ status: 'Starting compliance assessment...', progress: 0.1 });

    try {
      if (activeMode === 'AI_GEMINI_MULTIMODAL') {
        setProgressInfo({ status: 'Querying AI Vision Compliance Inspector...', progress: 0.3 });

        // Call backend /api/analyze
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imageSrc,
            mimeType: 'image/jpeg'
          })
        });

        const result = await response.json();

        if (result.success && result.data) {
          setProgressInfo({ status: 'Evaluating LMPC Rules 2011 clauses...', progress: 0.8 });
          const aiData = result.data;
          const mergedData: ExtractedPackageData = {
            commodityName: aiData.commodityName || '',
            brandName: aiData.brandName || '',
            manufacturerName: aiData.manufacturerName || '',
            manufacturerAddress: aiData.manufacturerAddress || '',
            netQuantityValue: aiData.netQuantityValue ?? null,
            netQuantityUnit: aiData.netQuantityUnit || '',
            rawNetQuantityString: aiData.rawNetQuantityString || `${aiData.netQuantityValue || ''} ${aiData.netQuantityUnit || ''}`,
            hasIllegalUnitSymbol: Boolean(aiData.hasIllegalUnitSymbol),
            illegalUnitDetected: aiData.illegalUnitDetected,
            mfgMonthYear: aiData.mfgMonthYear || '',
            expiryOrBestBefore: aiData.expiryOrBestBefore || '',
            mrpAmount: aiData.mrpAmount ?? null,
            mrpRawString: aiData.mrpAmount ? `₹ ${aiData.mrpAmount}` : '',
            isInclusiveOfAllTaxes: Boolean(aiData.isInclusiveOfAllTaxes),
            unitSalePriceDeclared: aiData.unitSalePriceDeclared || '',
            calculatedExpectedUSP: aiData.calculatedExpectedUSP || '',
            isUnitSalePriceCompliant: Boolean(aiData.isUnitSalePriceCompliant),
            consumerCareName: aiData.consumerCareName || '',
            consumerCarePhone: aiData.consumerCarePhone || '',
            consumerCareEmail: aiData.consumerCareEmail || '',
            consumerCareAddress: aiData.consumerCareAddress || '',
            countryOfOrigin: aiData.countryOfOrigin || '',
            batchOrLotNumber: aiData.batchOrLotNumber || '',
            estimatedLetterHeightMm: aiData.estimatedLetterHeightMm || 2.5,
            pdpAreaSqCm: 180
          };

          const rawText = result.rawOutput || JSON.stringify(aiData);
          const computedReport = evaluateLmpcCompliance(mergedData, rawText, 94);
          computedReport.analysisMode = 'AI_GEMINI_MULTIMODAL';
          setReport(computedReport);
          setStatusMessage('AI Multimodal scan completed successfully.');
          setIsProcessing(false);
          return;
        } else {
          // Graceful fallback to Offline OCR
          setStatusMessage('AI API key not configured or offline. Running 100% Offline OCR.');
          // Continue to fallback below
        }
      }

      // Offline OCR (Tesseract.js in-browser engine with selected languages)
      setProgressInfo({ status: `Initializing offline OCR (${ocrLanguage})...`, progress: 0.2 });
      const ocrResult = await performOfflineOcr(
        imageSrc,
        (p) => {
          setProgressInfo(p);
        },
        ocrLanguage
      );

      setProgressInfo({ status: 'Applying Legal Metrology 2011 Rule Engine...', progress: 0.9 });
      const extracted = extractDataFromText(ocrResult.text);
      const computedReport = evaluateLmpcCompliance(extracted, ocrResult.text, ocrResult.confidence);
      computedReport.analysisMode = 'OFFLINE_TESSERACT';
      if (ocrResult.regions && ocrResult.regions.length > 0) {
        computedReport.detectedRegions = ocrResult.regions;
      }
      setReport(computedReport);
      setStatusMessage('Offline OCR analysis completed successfully.');
    } catch (err: any) {
      console.error('Scan analysis error:', err);
      setStatusMessage('Encountered an issue during scanning. Falling back to rule heuristics.');
      // Extract with fallback heuristics
      const fallbackExtracted = extractDataFromText('Commodity Specimen');
      const fallbackReport = evaluateLmpcCompliance(fallbackExtracted, '', 75);
      setReport(fallbackReport);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Handle Benchmark Sample Selection
  const handleSelectBenchmark = (sample: BenchmarkSample) => {
    setSelectedSampleId(sample.id);
    setCurrentImage(sample.imageSrc);
    setSelectedRegionId(undefined);
    setSelectedRuleId(undefined);

    // If selecting bilingual benchmark sample, auto-adjust OCR language if appropriate
    if (sample.id === 'sample_bilingual_atta_compliant') {
      setOcrLanguage('eng+hin');
    }

    const extracted = extractDataFromText(sample.ocrText);
    const finalData = {
      ...extracted,
      ...(sample.extractedData as ExtractedPackageData)
    };
    const newReport = evaluateLmpcCompliance(finalData, sample.ocrText, 95);
    newReport.analysisMode = analysisMode;
    setReport(newReport);
    setStatusMessage(`Loaded benchmark sample: ${sample.name}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Handle User File Upload
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCurrentImage(dataUrl);
      setSelectedSampleId('');
      processImageForCompliance(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle Camera Capture
  const handleCameraCapture = (imageDataUrl: string) => {
    setCurrentImage(imageDataUrl);
    setSelectedSampleId('');
    processImageForCompliance(imageDataUrl);
  };

  // Handle Manual Inspector Correction
  const handleManualDataSave = (updated: ExtractedPackageData) => {
    if (!report) return;
    const recalculated = evaluateLmpcCompliance(updated, report.rawOcrText, report.ocrConfidence);
    recalculated.analysisMode = report.analysisMode;
    setReport(recalculated);
    setStatusMessage('Legal Metrology compliance re-evaluated with updated declarations.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Top Application Header */}
      <ScannerHeader
        analysisMode={analysisMode}
        onToggleMode={(mode) => {
          setAnalysisMode(mode);
          // Re-run analysis in newly selected mode
          processImageForCompliance(currentImage, mode);
        }}
        onOpenUpload={() => fileInputRef.current?.click()}
        onOpenCamera={() => setIsCameraOpen(true)}
        onSelectBenchmark={handleSelectBenchmark}
        selectedSampleId={selectedSampleId}
        isProcessing={isProcessing}
        currentLanguage={currentLanguage}
        onChangeLanguage={(lang) => setCurrentLanguage(lang)}
        ocrLanguage={ocrLanguage}
        onChangeOcrLanguage={(newOcrLang) => {
          setOcrLanguage(newOcrLang);
          setStatusMessage(`OCR language set to: ${newOcrLang}`);
          setTimeout(() => setStatusMessage(null), 2500);
        }}
      />

      {/* Global Status Banner / Toast */}
      {statusMessage && (
        <div className="bg-indigo-900/80 border-b border-indigo-700/60 px-4 py-2 text-center text-xs font-medium text-indigo-200 flex items-center justify-center gap-2 animate-fade-in">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Progress Bar during OCR / AI Analysis */}
        {isProcessing && (
          <div className="p-4 rounded-xl bg-slate-900 border border-indigo-900/60 shadow-lg animate-pulse">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>{progressInfo.status}</span>
              </div>
              <span className="font-mono text-indigo-300">{Math.round(progressInfo.progress * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, progressInfo.progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Two-Column Grid: Visualizer on Left, Compliance Audit on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual PDP Inspector & Label Canvas */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <LabelVisualizer
              imageSrc={currentImage}
              report={report}
              selectedRegionId={selectedRegionId}
              onSelectRegion={(reg) => {
                setSelectedRegionId(reg?.id);
                if (reg?.matchedRuleId) {
                  setSelectedRuleId(reg.matchedRuleId);
                }
              }}
              isProcessing={isProcessing}
            />

            {/* Quick Actions & Drag & Drop Hint */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors flex items-center justify-between gap-4 text-xs text-slate-400"
            >
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-slate-200 font-semibold block">{t.dropPackagingImage}</span>
                  <span>{t.supportsPackagingPhotos}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0 border border-slate-700 transition-colors"
              >
                {t.browseFiles}
              </button>
            </div>

            {/* Statutory Reference Quick Guide */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-100">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>{t.statutoryMandateSummary}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t.statutoryMandateSummaryDesc}
              </p>
            </div>
          </div>

          {/* Right Column: Statutory Compliance Scorecard & Penalty Estimator */}
          <div className="lg:col-span-7 space-y-6">
            {report ? (
              <>
                <ComplianceScorecard
                  report={report}
                  selectedRuleId={selectedRuleId}
                  onSelectRule={(id) => setSelectedRuleId(id)}
                  onOpenNotice={() => setIsNoticeOpen(true)}
                  onOpenManualEdit={() => setIsManualEditOpen(true)}
                  language={currentLanguage}
                />

                {/* Section 36 Penalty Assessment */}
                <PenaltyCalculator report={report} />

                {/* Raw OCR Stream & JSON Inspector */}
                <RawOcrViewer report={report} />
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
                <p>Loading Legal Metrology Audit Suite...</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Legal Metrology (Packaged Commodities) Rules, 2011 &bull; Automated Statutory Compliance Auditor
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Engine: {analysisMode === 'OFFLINE_TESSERACT' ? `100% Offline Client Tesseract.js (${ocrLanguage})` : 'Gemini 3.8-Flash Multimodal'}
          </span>
        </div>
      </footer>

      {/* Official Notice Modal */}
      {report && (
        <OfficialNoticeModal
          isOpen={isNoticeOpen}
          onClose={() => setIsNoticeOpen(false)}
          report={report}
        />
      )}

      {/* Manual Correction Drawer */}
      {report && (
        <ManualCorrectionDrawer
          isOpen={isManualEditOpen}
          onClose={() => setIsManualEditOpen(false)}
          data={report.extractedData}
          onSave={handleManualDataSave}
        />
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}

