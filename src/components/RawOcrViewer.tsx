/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ComplianceReport } from '../types/legalMetrology';
import { Terminal, Copy, Check, FileCode } from 'lucide-react';

interface RawOcrViewerProps {
  report: ComplianceReport;
}

export const RawOcrViewer: React.FC<RawOcrViewerProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(report.rawOcrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">Raw Optical Character Recognition (OCR) Stream</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            Confidence: {report.ocrConfidence}%
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
            {report.analysisMode}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="p-4 bg-slate-950 text-slate-300 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text border-b border-slate-800">
        {report.rawOcrText || '// No text extracted from scanned label.'}
      </div>

      {/* Structured JSON Payload Inspector */}
      <details className="px-4 py-2 bg-slate-900/60 text-xs text-slate-400 cursor-pointer">
        <summary className="font-medium hover:text-slate-200 flex items-center gap-1">
          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          <span>View Parsed Structured Legal Metrology JSON</span>
        </summary>
        <pre className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-indigo-200 overflow-x-auto">
          {JSON.stringify(report.extractedData, null, 2)}
        </pre>
      </details>
    </div>
  );
};
