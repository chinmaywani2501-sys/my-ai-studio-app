/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ComplianceReport,
  LmpcRuleResult,
  RuleStatus,
  SupportedLanguage
} from '../types/legalMetrology';
import { TRANSLATIONS } from '../utils/translations';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  ArrowRight,
  Gavel,
  FileText,
  Languages
} from 'lucide-react';

interface ComplianceScorecardProps {
  report: ComplianceReport;
  onSelectRule?: (ruleId: string) => void;
  selectedRuleId?: string;
  onOpenNotice?: () => void;
  onOpenManualEdit?: () => void;
  language?: SupportedLanguage;
}

export const ComplianceScorecard: React.FC<ComplianceScorecardProps> = ({
  report,
  onSelectRule,
  selectedRuleId,
  onOpenNotice,
  onOpenManualEdit,
  language = 'en'
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [filter, setFilter] = useState<'ALL' | 'VIOLATIONS' | 'QUANTITY' | 'PRICING' | 'IDENTITY' | 'LANGUAGE'>('ALL');
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({
    RULE_6_1_C: true,
    RULE_6_1_E: true,
    RULE_9_LANGUAGE: true
  });

  const toggleExpand = (ruleId: string) => {
    setExpandedRules((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };

  const filteredRules = report.rules.filter((rule) => {
    if (filter === 'VIOLATIONS') return rule.status === 'VIOLATION';
    if (filter === 'QUANTITY') return rule.category === 'QUANTITY' || rule.category === 'TYPOGRAPHY';
    if (filter === 'PRICING') return rule.category === 'PRICING';
    if (filter === 'IDENTITY') return rule.category === 'IDENTITY' || rule.category === 'ORIGIN' || rule.category === 'CONSUMER_CARE';
    if (filter === 'LANGUAGE') return rule.category === 'LANGUAGE';
    return true;
  });

  const isCompliant = report.overallStatus === 'FULLY_COMPLIANT';
  const isViolation = report.overallStatus === 'NON_COMPLIANT';

  return (
    <div className="flex flex-col gap-4">
      {/* Executive Summary Card */}
      <div
        id="executive-summary-card"
        className={`p-5 rounded-xl border transition-all ${
          isCompliant
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100'
            : isViolation
            ? 'bg-rose-950/40 border-rose-800/60 text-rose-100'
            : 'bg-amber-950/40 border-amber-800/60 text-amber-100'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isCompliant
                  ? 'bg-emerald-600 text-white'
                  : isViolation
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {isCompliant ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : isViolation ? (
                <AlertOctagon className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {t.assessmentResult}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700/50">
                  {t.lmpcBadge}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight mt-0.5">
                {isCompliant
                  ? t.scorecardFullyCompliant
                  : isViolation
                  ? t.scorecardNonCompliant
                  : t.scorecardConditional}
              </h2>
              <p className="text-sm mt-1 opacity-90 leading-relaxed max-w-2xl">
                {isCompliant
                  ? t.descFullyCompliant
                  : isViolation
                  ? `${t.descNonCompliant} (${report.violationCount} ${t.violationsCount})`
                  : t.descConditional}
              </p>
            </div>
          </div>

          {/* Score & Fine Callout */}
          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-700/50 pt-3 md:pt-0 md:pl-6 gap-4 shrink-0">
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 block font-medium">{t.complianceScore}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">
                  {report.complianceScore}%
                </span>
                <span className="text-xs opacity-70 font-mono">/ 100</span>
              </div>
            </div>

            {report.violationCount > 0 && (
              <div className="text-right">
                <span className="text-xs text-rose-300 block font-semibold">{t.statutoryRisk}</span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  {t.upToFine}{report.maxStatutoryFineEstimate.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/80">
          <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">{t.rulesAudited}</span>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {report.totalRulesAudited}
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
            <span className="text-[11px] text-emerald-400 font-medium">{t.passedCount}</span>
            <div className="text-lg font-bold text-emerald-300 font-mono">
              {report.passedCount}
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-800/40">
            <span className="text-[11px] text-rose-400 font-medium">{t.violationsCount}</span>
            <div className="text-lg font-bold text-rose-300 font-mono">
              {report.violationCount}
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-800/40">
            <span className="text-[11px] text-amber-400 font-medium">{t.warningsCount}</span>
            <div className="text-lg font-bold text-amber-300 font-mono">
              {report.warningCount}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar (Official Notice & Verification) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl">
        {/* Category Filters */}
        <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 flex-wrap">
          <button
            id="filter-tab-all"
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.filterAll} ({report.rules.length})
          </button>
          <button
            id="filter-tab-violations"
            type="button"
            onClick={() => setFilter('VIOLATIONS')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              filter === 'VIOLATIONS' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.filterViolations}
            {report.violationCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 text-[10px] rounded-full border border-rose-700/60 font-mono">
                {report.violationCount}
              </span>
            )}
          </button>
          <button
            id="filter-tab-qty"
            type="button"
            onClick={() => setFilter('QUANTITY')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filter === 'QUANTITY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.filterQuantity}
          </button>
          <button
            id="filter-tab-pricing"
            type="button"
            onClick={() => setFilter('PRICING')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filter === 'PRICING' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.filterPricing}
          </button>
          <button
            id="filter-tab-language"
            type="button"
            onClick={() => setFilter('LANGUAGE')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              filter === 'LANGUAGE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-3 h-3" />
            <span>{t.filterLanguage}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenManualEdit && (
            <button
              id="manual-verify-btn"
              type="button"
              onClick={onOpenManualEdit}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.verifyEditFields}</span>
            </button>
          )}

          {onOpenNotice && (
            <button
              id="generate-notice-btn"
              type="button"
              onClick={onOpenNotice}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>{t.generateNotice}</span>
            </button>
          )}
        </div>
      </div>

      {/* Rules Breakdown List */}
      <div className="space-y-3">
        {filteredRules.map((rule) => {
          const isExpanded = expandedRules[rule.ruleId] || selectedRuleId === rule.ruleId;
          const isPass = rule.status === 'COMPLIANT';
          const isFail = rule.status === 'VIOLATION';
          const isWarn = rule.status === 'WARNING';

          return (
            <div
              key={rule.ruleId}
              id={`rule-card-${rule.ruleId}`}
              className={`rounded-xl border transition-all ${
                isFail
                  ? 'bg-slate-900/90 border-rose-900/70 shadow-sm'
                  : isWarn
                  ? 'bg-slate-900/90 border-amber-900/60'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => {
                  toggleExpand(rule.ruleId);
                  onSelectRule?.(rule.ruleId);
                }}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/40 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isPass ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isFail ? (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        {rule.ruleCode}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {rule.category}
                      </span>
                      {isFail && (
                        <span className="text-[10px] uppercase font-bold text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800/70">
                          Violation
                        </span>
                      )}
                      {isWarn && (
                        <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/70">
                          Attention
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-100 mt-1">
                      {rule.ruleTitle}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium hidden sm:inline text-slate-400">
                    {isPass ? t.compliant : isFail ? t.violation : t.warning}
                  </span>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Card Collapsible Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 text-sm">
                  {/* Statutory Clause */}
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t.statutoryRequirement}: <strong className="text-slate-300">{rule.statutoryClause}</strong></span>
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-xs font-semibold text-slate-400 block mb-1">{t.observedOnLabel}</span>
                      <div className="font-mono text-sm text-slate-200 break-words">
                        {rule.detectedText || 'None detected'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-xs font-semibold text-indigo-400 block mb-1">{t.legalStandard}</span>
                      <div className="text-xs text-slate-300 leading-relaxed">
                        {rule.expectedRequirement}
                      </div>
                    </div>
                  </div>

                  {/* Discrepancy Alert */}
                  {rule.discrepancy && (
                    <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-200 text-xs flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold mb-0.5 text-rose-300">{t.statutoryInfraction}:</strong>
                        <span className="leading-relaxed">{rule.discrepancy}</span>
                      </div>
                    </div>
                  )}

                  {/* Penalty Clause & Remedy */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1 text-xs">
                    <div className="flex-1 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                      <span className="text-slate-400 font-semibold block mb-0.5 flex items-center gap-1">
                        <Gavel className="w-3 h-3 text-amber-400" /> {t.penaltyRisk}:
                      </span>
                      <span>{rule.penaltyClause}</span>
                    </div>
                    <div className="flex-1 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
                      <span className="text-slate-400 font-semibold block mb-0.5 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-emerald-400" /> {t.correctiveAction}:
                      </span>
                      <span>{rule.correctiveAction}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
