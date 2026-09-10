/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ComplianceReport } from '../types/legalMetrology';
import {
  Gavel,
  ShieldAlert,
  Building2,
  AlertOctagon,
  Scale,
  FileSpreadsheet
} from 'lucide-react';

interface PenaltyCalculatorProps {
  report: ComplianceReport;
}

export const PenaltyCalculator: React.FC<PenaltyCalculatorProps> = ({ report }) => {
  const [offenseLevel, setOffenseLevel] = useState<'FIRST' | 'SECOND' | 'SUBSEQUENT'>('FIRST');
  const [isDirectorNominated, setIsDirectorNominated] = useState<boolean>(true);

  const violationCount = report.violationCount;

  // Legal Metrology Act 2009 Section 36 penalties:
  // 1st offense: up to ₹25,000
  // 2nd offense: up to ₹50,000
  // Subsequent offense: up to ₹1,00,000 or imprisonment up to 1 year or both
  let baseFinePerClause = 25000;
  if (offenseLevel === 'SECOND') baseFinePerClause = 50000;
  if (offenseLevel === 'SUBSEQUENT') baseFinePerClause = 100000;

  const totalEstimatedFine = violationCount * baseFinePerClause;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-sm text-white">
            Section 36 Statutory Liability & Penalty Estimator
          </h3>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
          Legal Metrology Act, 2009
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
        {/* Offense Level Selector */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium block">Statutory Offense History</label>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setOffenseLevel('FIRST')}
              className={`px-3 py-2 text-left rounded-lg border transition-all ${
                offenseLevel === 'FIRST'
                  ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold">First Offense</div>
              <div className="text-[11px] opacity-75">Sec 36(1): Fine up to ₹25,000 per violation</div>
            </button>
            <button
              type="button"
              onClick={() => setOffenseLevel('SECOND')}
              className={`px-3 py-2 text-left rounded-lg border transition-all ${
                offenseLevel === 'SECOND'
                  ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold">Second Offense</div>
              <div className="text-[11px] opacity-75">Sec 36(2): Fine up to ₹50,000 per violation</div>
            </button>
            <button
              type="button"
              onClick={() => setOffenseLevel('SUBSEQUENT')}
              className={`px-3 py-2 text-left rounded-lg border transition-all ${
                offenseLevel === 'SUBSEQUENT'
                  ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold">Subsequent Offense</div>
              <div className="text-[11px] opacity-75">Fine up to ₹1,00,000 or 1-year imprisonment</div>
            </button>
          </div>
        </div>

        {/* Corporate Director Liability Section 49 */}
        <div className="space-y-2 bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Section 49: Corporate Liability</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Under Section 49 of the Act, if a company commits an offense, every person who was in charge of the conduct of the business is deemed guilty unless a specific Director is formally nominated under Rule 29.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
              <input
                type="checkbox"
                checked={isDirectorNominated}
                onChange={(e) => setIsDirectorNominated(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded bg-slate-900 border-slate-700"
              />
              <span>Nominated Director in place under Rule 29</span>
            </label>
            <div className="text-[10px] text-slate-500 mt-1">
              {isDirectorNominated
                ? 'Liability restricted to Nominated Director & Company.'
                : 'All directors / partners individually liable for prosecution.'}
            </div>
          </div>
        </div>

        {/* Cumulative Estimation Box */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
              Cumulative Compounding Exposure
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {violationCount === 0 ? '₹ 0' : `₹ ${totalEstimatedFine.toLocaleString('en-IN')}`}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Based on {violationCount} active infraction(s) detected across Rule 6, 11, 12, 13 declarations.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300/90 flex items-start gap-1.5">
            <AlertOctagon className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              {violationCount > 0
                ? 'Packages liable to summary seizure by Legal Metrology Inspector under Rule 24.'
                : 'Zero active liability detected. Commodity passes statutory inspection.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
