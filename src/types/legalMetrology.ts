/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RuleStatus = 'COMPLIANT' | 'VIOLATION' | 'WARNING' | 'NOT_APPLICABLE';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'ta' | 'bn' | 'gu' | 'te' | 'kn';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  ocrLangCode: string; // e.g. 'eng', 'hin', 'mar', etc.
}

export interface LmpcRuleResult {
  ruleId: string;
  ruleCode: string; // e.g. "Rule 6(1)(a)"
  ruleTitle: string;
  category: 'IDENTITY' | 'QUANTITY' | 'PRICING' | 'MANUFACTURING' | 'CONSUMER_CARE' | 'ORIGIN' | 'TYPOGRAPHY' | 'LANGUAGE';
  statutoryClause: string;
  status: RuleStatus;
  detectedText: string;
  expectedRequirement: string;
  discrepancy?: string;
  legalRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  penaltyClause: string;
  correctiveAction: string;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DetectedTextRegion {
  id: string;
  text: string;
  confidence: number;
  box: BoundingBox;
  matchedRuleId?: string;
  fieldLabel?: string;
  status: 'pass' | 'fail' | 'warn' | 'neutral';
}

export interface ExtractedPackageData {
  commodityName: string;
  brandName?: string;
  manufacturerName: string;
  manufacturerAddress: string;
  packerDetails?: string;
  importerDetails?: string;
  netQuantityValue: number | null;
  netQuantityUnit: string;
  rawNetQuantityString: string;
  hasIllegalUnitSymbol: boolean;
  illegalUnitDetected?: string;
  mfgMonthYear: string;
  expiryOrBestBefore: string;
  mrpAmount: number | null;
  mrpRawString: string;
  isInclusiveOfAllTaxes: boolean;
  unitSalePriceDeclared: string;
  calculatedExpectedUSP: string;
  isUnitSalePriceCompliant: boolean;
  consumerCareName: string;
  consumerCarePhone: string;
  consumerCareEmail: string;
  consumerCareAddress: string;
  countryOfOrigin: string;
  batchOrLotNumber: string;
  estimatedLetterHeightMm: number;
  pdpAreaSqCm: number;
  detectedScripts?: string[];
  declaredLanguages?: string[];
  isLanguageCompliant?: boolean;
}

export interface ComplianceReport {
  overallStatus: 'FULLY_COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONALLY_COMPLIANT';
  complianceScore: number; // 0 - 100
  totalRulesAudited: number;
  passedCount: number;
  violationCount: number;
  warningCount: number;
  extractedData: ExtractedPackageData;
  rules: LmpcRuleResult[];
  detectedRegions: DetectedTextRegion[];
  rawOcrText: string;
  ocrConfidence: number;
  analysisMode: 'OFFLINE_TESSERACT' | 'AI_GEMINI_MULTIMODAL' | 'HYBRID';
  auditTimestamp: string;
  packageType: 'SOLID' | 'LIQUID' | 'COUNT' | 'UNKNOWN';
  maxStatutoryFineEstimate: number; // in INR (₹)
}

export interface BenchmarkSample {
  id: string;
  name: string;
  category: string;
  thumbnailBadge: string;
  description: string;
  expectedCompliance: 'COMPLIANT' | 'NON_COMPLIANT';
  imageSrc: string;
  ocrText: string;
  extractedData: Partial<ExtractedPackageData>;
}
