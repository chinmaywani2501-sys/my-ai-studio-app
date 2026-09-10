/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { ComplianceReport } from '../types/legalMetrology';
import {
  X,
  Printer,
  Copy,
  Download,
  FileCheck,
  ShieldAlert,
  Building,
  Scale
} from 'lucide-react';

interface OfficialNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ComplianceReport;
}

export const OfficialNoticeModal: React.FC<OfficialNoticeModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const data = report.extractedData;
  const violations = report.rules.filter((r) => r.status === 'VIOLATION');
  const warnings = report.rules.filter((r) => r.status === 'WARNING');
  const noticeNo = `LMPC/INSP/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`;
  const inspectionDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!printRef.current) return;
    navigator.clipboard.writeText(printRef.current.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Modal Action Header (Excluded from Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold">Statutory Inspection Notice Generator</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy Notice Text'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Notice Paper Content */}
        <div ref={printRef} className="p-8 sm:p-12 space-y-6 bg-white text-slate-900 text-sm leading-relaxed">
          {/* Government / Department Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <div className="text-xs font-bold tracking-widest uppercase text-slate-600 mb-1">
              GOVERNMENT OF INDIA &bull; MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
              Department of Legal Metrology
            </h1>
            <div className="text-xs text-slate-600 font-serif italic mt-0.5">
              Enforcement Wing &bull; Packaged Commodities Inspection Directorate
            </div>
            <div className="mt-2 text-xs font-mono font-bold text-slate-800">
              NOTICE REFERENCE: {noticeNo} &bull; DATE: {inspectionDate}
            </div>
          </div>

          {/* Subject Line */}
          <div className="bg-slate-100 p-3 rounded-lg border border-slate-300">
            <div className="font-bold text-xs uppercase text-slate-600">Subject:</div>
            <div className="font-bold text-sm text-slate-950">
              {report.overallStatus === 'FULLY_COMPLIANT'
                ? 'CERTIFICATE OF COMPLIANCE UNDER LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011'
                : 'STATUTORY INSPECTION NOTICE FOR DEFECTS UNDER LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011'}
            </div>
          </div>

          {/* Commodity Details Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Sample Commodity Inspection Details
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div>
                <span className="text-slate-500 font-medium">Commodity Generic Name:</span>{' '}
                <strong className="text-slate-900">{data.commodityName || 'Declared on label'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Brand Identity:</span>{' '}
                <strong className="text-slate-900">{data.brandName || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Declared Net Quantity:</span>{' '}
                <strong className="text-slate-900">{data.rawNetQuantityString || 'Unstated'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Declared MRP:</span>{' '}
                <strong className="text-slate-900">
                  {data.mrpAmount ? `₹ ${data.mrpAmount.toFixed(2)}` : 'Unstated'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Unit Sale Price (USP):</span>{' '}
                <strong className="text-slate-900">{data.unitSalePriceDeclared || 'Not Declared'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Mfg / PKD Month & Year:</span>{' '}
                <strong className="text-slate-900">{data.mfgMonthYear || 'Omitted'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 font-medium">Manufacturer / Packer:</span>{' '}
                <strong className="text-slate-900">
                  {data.manufacturerName ? `${data.manufacturerName}, ${data.manufacturerAddress}` : 'Omitted / Incomplete'}
                </strong>
              </div>
            </div>
          </div>

          {/* Infractions / Compliance Findings */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              2. Audit Findings & Statutory Assessment
            </h4>
            {violations.length === 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                <strong>COMPLIANCE VERIFIED:</strong> The scanned packaging specimen satisfies all mandatory declarations stipulated under Rule 6, Rule 11, Rule 12, Rule 13, and Rule 7 of the Legal Metrology (Packaged Commodities) Rules, 2011.
              </div>
            ) : (
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div key={v.ruleId} className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-950">
                    <div className="font-bold flex items-center gap-1.5 text-rose-900">
                      <span>{i + 1}.</span>
                      <span>{v.ruleTitle} ({v.ruleCode})</span>
                    </div>
                    <div className="mt-1 text-slate-700">
                      <strong>Observed Defect:</strong> {v.discrepancy}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-rose-800">
                      <strong>Statutory Liability:</strong> {v.penaltyClause}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Directives and Legal Warning */}
          {violations.length > 0 && (
            <div className="border-t border-slate-200 pt-4 text-xs text-slate-700 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                3. Directives & Action Required
              </h4>
              <p>
                Take notice that distribution or sale of pre-packaged commodities lacking mandatory statutory declarations constitutes an offence under <strong>Section 36(1) of the Legal Metrology Act, 2009</strong>, rendering non-standard packages liable for seizure and compounding fine up to <strong>₹25,000/-</strong> for first offence.
              </p>
              <p>
                The manufacturer / packer / distributor is hereby instructed to rectify labeling defects or submit explanation within <strong>15 days</strong> of receipt of this communication.
              </p>
            </div>
          )}

          {/* Official Signatures & Seal */}
          <div className="pt-8 flex items-end justify-between border-t border-slate-200">
            <div>
              <div className="text-[10px] font-mono text-slate-500">SYSTEM AUDIT VERIFICATION CODE</div>
              <div className="text-xs font-mono font-bold text-slate-800">
                HASH: {Math.random().toString(36).substring(2, 12).toUpperCase()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Generated by LMPC AI/OCR Auditor Engine</div>
            </div>

            <div className="text-right">
              <div className="h-10 border-b border-slate-400 w-48 mb-1" />
              <div className="text-xs font-bold text-slate-900">Authorized Legal Metrology Inspector</div>
              <div className="text-[10px] text-slate-500">Government Inspection & Enforcement Wing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
