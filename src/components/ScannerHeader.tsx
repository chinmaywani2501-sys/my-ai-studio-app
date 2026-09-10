/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Scale,
  Camera,
  Upload,
  Cpu,
  Wifi,
  WifiOff,
  Sparkles,
  FileCheck,
  Layers,
  ChevronDown,
  Globe,
  Languages
} from 'lucide-react';
import { BENCHMARK_COMMODITY_SAMPLES } from '../utils/sampleCommodities';
import { BenchmarkSample, SupportedLanguage } from '../types/legalMetrology';
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from '../utils/translations';

interface ScannerHeaderProps {
  analysisMode: 'OFFLINE_TESSERACT' | 'AI_GEMINI_MULTIMODAL';
  onToggleMode: (mode: 'OFFLINE_TESSERACT' | 'AI_GEMINI_MULTIMODAL') => void;
  onOpenUpload: () => void;
  onOpenCamera: () => void;
  onSelectBenchmark: (sample: BenchmarkSample) => void;
  selectedSampleId?: string;
  isProcessing?: boolean;
  currentLanguage: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  ocrLanguage: string;
  onChangeOcrLanguage: (ocrLang: string) => void;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({
  analysisMode,
  onToggleMode,
  onOpenUpload,
  onOpenCamera,
  onSelectBenchmark,
  selectedSampleId,
  isProcessing,
  currentLanguage,
  onChangeLanguage,
  ocrLanguage,
  onChangeOcrLanguage
}) => {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/10">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t.appTitle}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  {t.lmpcBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Engine Selector & Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Multi-Language Interface Selector */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 gap-1.5 focus-within:ring-1 focus-within:ring-indigo-500">
                <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  id="app-language-selector"
                  value={currentLanguage}
                  onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
                  className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-4 appearance-none"
                  title="Select Application Language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                      {lang.nativeLabel} ({lang.label})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 -ml-3 pointer-events-none" />
              </div>
            </div>

            {/* OCR Language Selector (only shown or highlighted for offline/hybrid OCR) */}
            {analysisMode === 'OFFLINE_TESSERACT' && (
              <div className="relative inline-flex items-center">
                <div className="flex items-center bg-slate-950 border border-emerald-800/60 rounded-lg px-2 py-1.5 gap-1.5" title="Tesseract OCR Recognition Language">
                  <Languages className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider hidden sm:inline">OCR:</span>
                  <select
                    id="ocr-language-selector"
                    value={ocrLanguage}
                    onChange={(e) => onChangeOcrLanguage(e.target.value)}
                    className="bg-transparent text-emerald-200 text-xs font-semibold focus:outline-none cursor-pointer pr-4 appearance-none"
                  >
                    <option value="eng" className="bg-slate-900 text-white">English (eng)</option>
                    <option value="eng+hin" className="bg-slate-900 text-white">Hindi + English (eng+hin)</option>
                    <option value="eng+mar" className="bg-slate-900 text-white">Marathi + English (eng+mar)</option>
                    <option value="eng+tam" className="bg-slate-900 text-white">Tamil + English (eng+tam)</option>
                    <option value="eng+ben" className="bg-slate-900 text-white">Bengali + English (eng+ben)</option>
                    <option value="eng+guj" className="bg-slate-900 text-white">Gujarati + English (eng+guj)</option>
                    <option value="eng+tel" className="bg-slate-900 text-white">Telugu + English (eng+tel)</option>
                    <option value="eng+kan" className="bg-slate-900 text-white">Kannada + English (eng+kan)</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-emerald-400 -ml-3 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Dual Engine Switcher: Offline Model vs Free Gemini API */}
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                id="mode-offline-btn"
                type="button"
                onClick={() => onToggleMode('OFFLINE_TESSERACT')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  analysisMode === 'OFFLINE_TESSERACT'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t.offlineTooltip}
              >
                <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t.offlineOcr}</span>
              </button>

              <button
                id="mode-ai-btn"
                type="button"
                onClick={() => onToggleMode('AI_GEMINI_MULTIMODAL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  analysisMode === 'AI_GEMINI_MULTIMODAL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t.aiTooltip}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>{t.aiVision}</span>
              </button>
            </div>

            {/* Benchmark Samples Dropdown */}
            <div className="relative inline-block">
              <select
                id="benchmark-sample-select"
                value={selectedSampleId || ''}
                onChange={(e) => {
                  const sample = BENCHMARK_COMMODITY_SAMPLES.find((s) => s.id === e.target.value);
                  if (sample) onSelectBenchmark(sample);
                }}
                className="appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="" disabled>
                  {t.loadBenchmark}
                </option>
                {BENCHMARK_COMMODITY_SAMPLES.map((sample) => (
                  <option key={sample.id} value={sample.id}>
                    {sample.expectedCompliance === 'COMPLIANT' ? '✔' : '✖'} {sample.name} ({sample.category})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Live Camera Scanner */}
            <button
              id="header-camera-btn"
              type="button"
              onClick={onOpenCamera}
              disabled={isProcessing}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t.cameraBtn}</span>
            </button>

            {/* Upload Image */}
            <button
              id="header-upload-btn"
              type="button"
              onClick={onOpenUpload}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.uploadBtn}</span>
            </button>
          </div>
        </div>

        {/* Benchmark Chips Bar (for 1-click test in Hackathon demo) */}
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-800/60 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold text-[11px] shrink-0 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3" /> {t.benchmarkTests}
          </span>
          {BENCHMARK_COMMODITY_SAMPLES.map((sample) => {
            const isSelected = sample.id === selectedSampleId;
            const isPass = sample.expectedCompliance === 'COMPLIANT';

            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSelectBenchmark(sample)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-indigo-950 text-indigo-200 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPass ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span>{sample.name.split('(')[0].trim()}</span>
                <span className="text-[10px] opacity-60">({sample.thumbnailBadge})</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

