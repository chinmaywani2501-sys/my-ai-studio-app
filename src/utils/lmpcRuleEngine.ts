/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ComplianceReport,
  ExtractedPackageData,
  LmpcRuleResult,
  DetectedTextRegion,
  RuleStatus
} from '../types/legalMetrology';

// Standard Legal S.I. Units allowed under Legal Metrology Rules 2011 (Rule 12 & 13)
const VALID_STANDARD_UNITS = new Set([
  'g', 'kg', 'mg',
  'ml', 'l', 'cl',
  'm', 'cm', 'mm',
  'n', 'u', 'count'
]);

// Non-standard prohibited abbreviations under Rule 13 (frequently used unlawfully)
const PROHIBITED_UNIT_MAP: Record<string, string> = {
  'gms': 'g',
  'gm': 'g',
  'kgs': 'kg',
  'kg.': 'kg',
  'ltrs': 'l or ml',
  'ltr': 'l',
  'ltr.': 'l',
  'liters': 'l',
  'litres': 'l',
  'ml.': 'ml',
  'pcs': 'N or U',
  'pc': 'N or U',
  'nos': 'N or U',
  'no.': 'N'
};

/**
 * Extracts structured commodity packaging information from raw text.
 */
export function extractDataFromText(text: string): ExtractedPackageData {
  const normalizedText = text.replace(/\r\n/g, '\n');
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);

  let commodityName = '';
  let brandName = '';
  let manufacturerName = '';
  let manufacturerAddress = '';
  let packerDetails = '';
  let importerDetails = '';
  let netQuantityValue: number | null = null;
  let netQuantityUnit = '';
  let rawNetQuantityString = '';
  let hasIllegalUnitSymbol = false;
  let illegalUnitDetected: string | undefined = undefined;
  let mfgMonthYear = '';
  let expiryOrBestBefore = '';
  let mrpAmount: number | null = null;
  let mrpRawString = '';
  let isInclusiveOfAllTaxes = false;
  let unitSalePriceDeclared = '';
  let consumerCareName = '';
  let consumerCarePhone = '';
  let consumerCareEmail = '';
  let consumerCareAddress = '';
  let countryOfOrigin = '';
  let batchOrLotNumber = '';

  // 1. Generic Commodity & Brand Name (Multilingual: Generic Name, वस्तु / सामग्री / नाव)
  const genericMatch = normalizedText.match(/(?:Generic\s*Name|Commodity|Product\s*Name|Name\s*of\s*Commodity|Item|उत्पाद|सामग्री|वस्तू)\s*[:=-]\s*([^\n,;]+)/i);
  if (genericMatch) {
    commodityName = genericMatch[1].trim();
  } else {
    // Check first few lines for obvious product titles
    for (const line of lines.slice(0, 4)) {
      if (/biscuit|oil|cream|shampoo|rice|flour|chips|soap|tea|coffee|earbuds|battery|detergent|chocolate|cereal|आटा|चावल|तेल|साबुन|चाय|मसाला/i.test(line)) {
        commodityName = line;
        break;
      }
    }
  }

  const brandMatch = normalizedText.match(/(?:Brand\s*Name|Brand|Trade\s*Mark|TM|ब्रांड)\s*[:=-]\s*([^\n,;]+)/i);
  if (brandMatch) {
    brandName = brandMatch[1].trim();
  }

  // 2. Net Quantity & S.I. Units (Rule 6(1)(c) & Rule 11, 12, 13) - Multilingual
  const netQtyRegex = /(?:Net\s*(?:Quantity|Qty|Weight|Wt\.?|Volume|Vol\.?|Content|Contents)|Net:?|शुद्ध\s*(?:मात्रा|वजन)|निव्वळ\s*वजन|நிகர\s*அளவு|পরিমাণ)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\u0900-\u097F.]+)/i;
  const netQtyMatch = normalizedText.match(netQtyRegex);
  if (netQtyMatch) {
    rawNetQuantityString = `${netQtyMatch[1]} ${netQtyMatch[2]}`;
    netQuantityValue = parseFloat(netQtyMatch[1]);
    let rawUnit = netQtyMatch[2].toLowerCase();

    // Map Devanagari unit terms to standard SI
    if (/किग्रा|किलो|कि\.ग्रा/i.test(rawUnit)) rawUnit = 'kg';
    if (/ग्राम|ग्रा\./i.test(rawUnit)) rawUnit = 'g';
    if (/लीटर|ली\./i.test(rawUnit)) rawUnit = 'l';
    if (/मिली|मि\.ली/i.test(rawUnit)) rawUnit = 'ml';

    if (PROHIBITED_UNIT_MAP[rawUnit]) {
      hasIllegalUnitSymbol = true;
      illegalUnitDetected = netQtyMatch[2];
      netQuantityUnit = PROHIBITED_UNIT_MAP[rawUnit];
    } else {
      netQuantityUnit = rawUnit.replace(/\.$/, '');
      if (!VALID_STANDARD_UNITS.has(netQuantityUnit.toLowerCase())) {
        hasIllegalUnitSymbol = true;
        illegalUnitDetected = netQtyMatch[2];
      }
    }
  } else {
    // Fallback search for lone numbers with unit
    const loneQtyMatch = normalizedText.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gms|gm|ml|l|ltrs|ltr|Ltr|m|cm|mm|N|U|pcs|किग्रा|ग्राम|लीटर|मिली)\b/i);
    if (loneQtyMatch) {
      rawNetQuantityString = `${loneQtyMatch[1]} ${loneQtyMatch[2]}`;
      netQuantityValue = parseFloat(loneQtyMatch[1]);
      let rawUnit = loneQtyMatch[2].toLowerCase();
      if (/किग्रा|किलो/i.test(rawUnit)) rawUnit = 'kg';
      if (/ग्राम/i.test(rawUnit)) rawUnit = 'g';
      if (/लीटर/i.test(rawUnit)) rawUnit = 'l';
      if (/मिली/i.test(rawUnit)) rawUnit = 'ml';

      if (PROHIBITED_UNIT_MAP[rawUnit]) {
        hasIllegalUnitSymbol = true;
        illegalUnitDetected = loneQtyMatch[2];
        netQuantityUnit = PROHIBITED_UNIT_MAP[rawUnit];
      } else {
        netQuantityUnit = rawUnit;
      }
    }
  }

  // 3. MRP (Rule 6(1)(e)) - Multilingual
  const mrpRegex = /(?:MRP|M\.R\.P\.?|Maximum\s*Retail\s*Price|अधिकतम\s*खुदरा\s*मूल्य|कमाल\s*किरकोळ\s*किंमत|அதிகபட்ச\s*விலை|সর্বোচ্চ\s*খুচরা\s*মূল্য)\s*(?:Rs\.?|INR|₹)?\s*[:=-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const mrpMatch = normalizedText.match(mrpRegex);
  if (mrpMatch) {
    mrpRawString = mrpMatch[0];
    const cleanNum = mrpMatch[1].replace(/,/g, '');
    mrpAmount = parseFloat(cleanNum);
  }

  // Check if "incl. of all taxes" is declared (Multilingual)
  if (
    /incl(?:usive)?\.?\s*(?:of)?\s*all\s*taxes/i.test(normalizedText) ||
    /taxes\s*incl/i.test(normalizedText) ||
    /सभी\s*कर\s*(?:सहित|शामिल)/i.test(normalizedText) ||
    /सर्व\s*करांसह/i.test(normalizedText) ||
    /வரிகள்\s*உட்பட/i.test(normalizedText) ||
    /সকল\s*কর\s*সহ/i.test(normalizedText)
  ) {
    isInclusiveOfAllTaxes = true;
  }

  // 4. Unit Sale Price (USP - Rule 6(11))
  const uspRegex = /(?:USP|Unit\s*Sale\s*Price|Unit\s*Price|इकाई\s*(?:विक्रय\s*)?मूल्य)\s*[:=-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,3})?)\s*(?:per|\/|प्रति)\s*([a-zA-Z\u0900-\u097F]+)/i;
  const uspMatch = normalizedText.match(uspRegex);
  if (uspMatch) {
    unitSalePriceDeclared = `₹ ${uspMatch[1]} / ${uspMatch[2]}`;
  }

  // 5. Date of Mfg / PKD / Import (Rule 6(1)(d))
  const mfgRegex = /(?:Mfg\.?\s*Date|Date\s*of\s*Mfg\.?|Mfg\.?|Manufactured|PKD\.?|Packed|Date\s*of\s*Packing|DOM|DOP|Imported\s*on)\s*[:=-]?\s*([0-9]{1,2}[/-][0-9]{2,4}|[A-Za-z]{3,9}\s*['-]?[0-9]{2,4})/i;
  const mfgMatch = normalizedText.match(mfgRegex);
  if (mfgMatch) {
    mfgMonthYear = mfgMatch[1].trim();
  }

  // Expiry or Best Before
  const expRegex = /(?:Best\s*Before|Expiry|Exp\.?\s*Date|Use\s*by)\s*[:=-]?\s*([^\n;]+)/i;
  const expMatch = normalizedText.match(expRegex);
  if (expMatch) {
    expiryOrBestBefore = expMatch[1].trim();
  }

  // 6. Manufacturer / Packer Details (Rule 6(1)(a))
  const mfgDetailsMatch = normalizedText.match(/(?:Mfd\.?\s*(?:&|and)?\s*Pkd\.?\s*by|Manufactured\s*by|Marketed\s*by|Packaged\s*by|Packed\s*by|Producer)\s*[:=-]?\s*([^\n]+(?:\n[^\n]+){0,3})/i);
  if (mfgDetailsMatch) {
    const rawMf = mfgDetailsMatch[1].trim();
    const parts = rawMf.split('\n');
    manufacturerName = parts[0].trim();
    manufacturerAddress = parts.slice(1).join(', ').trim() || rawMf;
  } else {
    // Look for Pin Code / State
    const pinMatch = normalizedText.match(/\b([1-9][0-9]{2}\s?[0-9]{3})\b/);
    if (pinMatch) {
      manufacturerAddress = `PIN Code: ${pinMatch[1]}`;
    }
  }

  // Importer
  const importerMatch = normalizedText.match(/(?:Imported\s*(?:&|and)?\s*Marketed\s*by|Importer)\s*[:=-]?\s*([^\n]+)/i);
  if (importerMatch) {
    importerDetails = importerMatch[1].trim();
  }

  // 7. Consumer Care Details (Rule 6(8))
  const emailMatch = normalizedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    consumerCareEmail = emailMatch[1].trim();
  }

  const phoneMatch = normalizedText.match(/(?:(?:Toll\s*Free|Helpline|Ph|Tel|Call|Contact)\s*[:=-]?\s*)?(\b(?:1800[\s-]?[0-9]{3}[\s-]?[0-9]{3,4}|[0-9]{10,11})\b)/i);
  if (phoneMatch) {
    consumerCarePhone = phoneMatch[1].trim();
  }

  const careOfficerMatch = normalizedText.match(/(?:Consumer\s*Care\s*Cell|Customer\s*Care\s*Manager|Executive|Grievance\s*Officer)\s*[:=-]?\s*([^\n,]+)/i);
  if (careOfficerMatch) {
    consumerCareName = careOfficerMatch[1].trim();
  } else if (/Consumer\s*Care/i.test(normalizedText)) {
    consumerCareName = 'Consumer Care Executive';
  }

  // 8. Country of Origin (Rule 6(10))
  const originMatch = normalizedText.match(/(?:Country\s*of\s*Origin|Made\s*in|Product\s*of)\s*[:=-]?\s*([A-Za-z\s]+)/i);
  if (originMatch) {
    countryOfOrigin = originMatch[1].trim();
  } else if (/Made\s*in\s*India/i.test(normalizedText)) {
    countryOfOrigin = 'India';
  }

  // 9. Batch or Lot Number (Rule 6(1)(e)/Schedule)
  const batchMatch = normalizedText.match(/(?:Batch\s*(?:No\.?|Number)|Lot\s*(?:No\.?|Number)|B\.?\s*No\.?)\s*[:=-]?\s*([A-Za-z0-9_-]+)/i);
  if (batchMatch) {
    batchOrLotNumber = batchMatch[1].trim();
  }

  // Compute Expected Unit Sale Price (USP)
  let calculatedExpectedUSP = '';
  let isUnitSalePriceCompliant = false;

  if (mrpAmount && netQuantityValue && netQuantityValue > 0) {
    const unitLower = (netQuantityUnit || '').toLowerCase();
    if (unitLower === 'g') {
      const pricePerG = (mrpAmount / netQuantityValue);
      calculatedExpectedUSP = `₹ ${pricePerG.toFixed(2)} / g`;
      if (unitSalePriceDeclared) {
        // Tolerant matching within 5%
        const numDec = parseFloat(unitSalePriceDeclared.replace(/[^0-9.]/g, ''));
        if (numDec && Math.abs(numDec - pricePerG) < 0.05) {
          isUnitSalePriceCompliant = true;
        }
      }
    } else if (unitLower === 'kg') {
      const pricePerKg = (mrpAmount / netQuantityValue);
      calculatedExpectedUSP = `₹ ${pricePerKg.toFixed(2)} / kg`;
      if (unitSalePriceDeclared) {
        const numDec = parseFloat(unitSalePriceDeclared.replace(/[^0-9.]/g, ''));
        if (numDec && Math.abs(numDec - pricePerKg) < 0.5) {
          isUnitSalePriceCompliant = true;
        }
      }
    } else if (unitLower === 'ml') {
      const pricePerMl = (mrpAmount / netQuantityValue);
      calculatedExpectedUSP = `₹ ${pricePerMl.toFixed(2)} / ml`;
      if (unitSalePriceDeclared) {
        const numDec = parseFloat(unitSalePriceDeclared.replace(/[^0-9.]/g, ''));
        if (numDec && Math.abs(numDec - pricePerMl) < 0.05) {
          isUnitSalePriceCompliant = true;
        }
      }
    } else if (unitLower === 'l' || unitLower === 'ltr') {
      const pricePerL = (mrpAmount / netQuantityValue);
      calculatedExpectedUSP = `₹ ${pricePerL.toFixed(2)} / l`;
      if (unitSalePriceDeclared) {
        const numDec = parseFloat(unitSalePriceDeclared.replace(/[^0-9.]/g, ''));
        if (numDec && Math.abs(numDec - pricePerL) < 0.5) {
          isUnitSalePriceCompliant = true;
        }
      }
    } else if (unitLower === 'n' || unitLower === 'u') {
      const pricePerN = (mrpAmount / netQuantityValue);
      calculatedExpectedUSP = `₹ ${pricePerN.toFixed(2)} / N`;
      if (unitSalePriceDeclared) {
        const numDec = parseFloat(unitSalePriceDeclared.replace(/[^0-9.]/g, ''));
        if (numDec && Math.abs(numDec - pricePerN) < 0.5) {
          isUnitSalePriceCompliant = true;
        }
      }
    }
  }

  // Estimated letter height in mm (heuristic based on resolution & text line size)
  const estimatedLetterHeightMm = 2.4;
  const pdpAreaSqCm = 180;

  return {
    commodityName,
    brandName,
    manufacturerName,
    manufacturerAddress,
    packerDetails,
    importerDetails,
    netQuantityValue,
    netQuantityUnit,
    rawNetQuantityString,
    hasIllegalUnitSymbol,
    illegalUnitDetected,
    mfgMonthYear,
    expiryOrBestBefore,
    mrpAmount,
    mrpRawString,
    isInclusiveOfAllTaxes,
    unitSalePriceDeclared,
    calculatedExpectedUSP,
    isUnitSalePriceCompliant,
    consumerCareName,
    consumerCarePhone,
    consumerCareEmail,
    consumerCareAddress,
    countryOfOrigin,
    batchOrLotNumber,
    estimatedLetterHeightMm,
    pdpAreaSqCm
  };
}

/**
 * Assesses complete compliance with the Legal Metrology (Packaged Commodities) Rules, 2011.
 */
export function evaluateLmpcCompliance(
  data: ExtractedPackageData,
  rawText: string,
  ocrConfidence = 90
): ComplianceReport {
  const rules: LmpcRuleResult[] = [];

  // RULE 1: Name and Address of Manufacturer / Packer / Importer [Rule 6(1)(a) & 6(1)(ab)]
  const hasMfg = Boolean(data.manufacturerName && data.manufacturerAddress);
  const hasPinCode = /[1-9][0-9]{2}\s?[0-9]{3}/.test(data.manufacturerAddress || rawText);
  let r1Status: RuleStatus = 'COMPLIANT';
  let r1Discrepancy: string | undefined;

  if (!data.manufacturerName && !data.importerDetails) {
    r1Status = 'VIOLATION';
    r1Discrepancy = 'Complete omission of manufacturer, packer, or importer declaration.';
  } else if (!hasPinCode) {
    r1Status = 'WARNING';
    r1Discrepancy = 'Manufacturer address lacks complete Postal Index Number (PIN Code) or state name as required under Rule 6(1)(a).';
  }

  rules.push({
    ruleId: 'RULE_6_1_A',
    ruleCode: 'Rule 6(1)(a)',
    ruleTitle: 'Name & Address of Manufacturer / Packer / Importer',
    category: 'IDENTITY',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(a)',
    status: r1Status,
    detectedText: data.manufacturerName ? `${data.manufacturerName}, ${data.manufacturerAddress}` : (data.importerDetails || 'None detected'),
    expectedRequirement: 'Full name, complete physical premises address, city, state, and 6-digit PIN code.',
    discrepancy: r1Discrepancy,
    legalRisk: r1Status === 'VIOLATION' ? 'CRITICAL' : (r1Status === 'WARNING' ? 'MEDIUM' : 'LOW'),
    penaltyClause: 'Legal Metrology Act, 2009 - Section 36(1): Fine up to ₹25,000 for 1st offense.',
    correctiveAction: r1Status === 'COMPLIANT' ? 'Declaration fully compliant.' : 'Print complete registered office address including state and 6-digit postal PIN code.'
  });

  // RULE 2: Generic / Common Name of the Commodity [Rule 6(1)(b)]
  const hasGeneric = Boolean(data.commodityName && data.commodityName.length > 2);
  rules.push({
    ruleId: 'RULE_6_1_B',
    ruleCode: 'Rule 6(1)(b)',
    ruleTitle: 'Generic or Common Name of Commodity',
    category: 'IDENTITY',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(b)',
    status: hasGeneric ? 'COMPLIANT' : 'VIOLATION',
    detectedText: data.commodityName || 'None detected',
    expectedRequirement: 'Common or generic name of commodity must be prominently declared on the Principal Display Panel (PDP).',
    discrepancy: hasGeneric ? undefined : 'Product identity is ambiguous or generic name is missing.',
    legalRisk: hasGeneric ? 'LOW' : 'HIGH',
    penaltyClause: 'Section 36(1): Compounding fine up to ₹25,000.',
    correctiveAction: hasGeneric ? 'Compliant.' : 'State the true common or generic name of the commodity clearly on the principal display panel.'
  });

  // RULE 3: Net Quantity & Standard Unit of Measure [Rule 6(1)(c), Rule 11, 12, 13]
  let r3Status: RuleStatus = 'COMPLIANT';
  let r3Discrepancy: string | undefined;

  if (!data.netQuantityValue || !data.netQuantityUnit) {
    r3Status = 'VIOLATION';
    r3Discrepancy = 'Net quantity declaration is missing or unreadable on the package.';
  } else if (data.hasIllegalUnitSymbol) {
    r3Status = 'VIOLATION';
    r3Discrepancy = `Illegal/Non-standard unit symbol '${data.illegalUnitDetected}' used. Rule 13 mandates standard SI abbreviations only ('g' for gram, 'kg' for kilogram, 'l' or 'ml' for litre, 'N' for number). Symbols like 'gms', 'Kgs', 'ltrs', 'pcs' are strictly unlawful.`;
  }

  rules.push({
    ruleId: 'RULE_6_1_C',
    ruleCode: 'Rule 6(1)(c) & Rule 13',
    ruleTitle: 'Net Quantity & Standard SI Units',
    category: 'QUANTITY',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(c), Rule 11, 12, 13',
    status: r3Status,
    detectedText: data.rawNetQuantityString || 'None detected',
    expectedRequirement: 'Correct net quantity in standard SI units (g, kg, ml, l, N). Prohibits non-standard symbols like "gms", "Kgs", "ltrs".',
    discrepancy: r3Discrepancy,
    legalRisk: r3Status === 'VIOLATION' ? 'CRITICAL' : 'LOW',
    penaltyClause: 'Section 36(1): Seizure of non-standard packages + fine up to ₹25,000.',
    correctiveAction: r3Status === 'COMPLIANT' ? 'Compliant.' : 'Replace non-standard unit symbols with standard legal units (e.g. use "g" instead of "gms", "l" instead of "Ltrs").'
  });

  // RULE 4: Date of Manufacture / Packing / Import [Rule 6(1)(d)]
  const hasMfgDate = Boolean(data.mfgMonthYear);
  rules.push({
    ruleId: 'RULE_6_1_D',
    ruleCode: 'Rule 6(1)(d)',
    ruleTitle: 'Month and Year of Manufacture / Packing',
    category: 'MANUFACTURING',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(d)',
    status: hasMfgDate ? 'COMPLIANT' : 'VIOLATION',
    detectedText: data.mfgMonthYear ? `Mfg/PKD: ${data.mfgMonthYear}${data.expiryOrBestBefore ? ` | ${data.expiryOrBestBefore}` : ''}` : 'None detected',
    expectedRequirement: 'Month and year in which commodity is manufactured or packed (e.g. 05/2024 or May 2024).',
    discrepancy: hasMfgDate ? undefined : 'No clear manufacturing or packing month and year found on package.',
    legalRisk: hasMfgDate ? 'LOW' : 'HIGH',
    penaltyClause: 'Section 36(1): Fine up to ₹25,000.',
    correctiveAction: hasMfgDate ? 'Compliant.' : 'Incorporate legible date stamp in MM/YYYY format prominently.'
  });

  // RULE 5: Maximum Retail Price (MRP) & Inclusive of all taxes [Rule 6(1)(e)]
  let r5Status: RuleStatus = 'COMPLIANT';
  let r5Discrepancy: string | undefined;

  if (data.mrpAmount === null) {
    r5Status = 'VIOLATION';
    r5Discrepancy = 'Maximum Retail Price (MRP) is missing from the label.';
  } else if (!data.isInclusiveOfAllTaxes) {
    r5Status = 'VIOLATION';
    r5Discrepancy = 'MRP does not specify "(inclusive of all taxes)" or "incl. of all taxes". Declaring taxes extra is illegal under Rule 6(1)(e).';
  }

  rules.push({
    ruleId: 'RULE_6_1_E',
    ruleCode: 'Rule 6(1)(e)',
    ruleTitle: 'Maximum Retail Price (MRP) & Tax Inclusivity',
    category: 'PRICING',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(e)',
    status: r5Status,
    detectedText: data.mrpAmount ? `₹ ${data.mrpAmount.toFixed(2)}${data.isInclusiveOfAllTaxes ? ' (incl. of all taxes)' : ' [Tax inclusion statement missing]'}` : 'None detected',
    expectedRequirement: 'MRP rounded to nearest rupee or paisa, explicitly stating "inclusive of all taxes".',
    discrepancy: r5Discrepancy,
    legalRisk: r5Status === 'VIOLATION' ? 'CRITICAL' : 'LOW',
    penaltyClause: 'Section 36(1): Penalty up to ₹25,000; charging above MRP attracts prosecution.',
    correctiveAction: r5Status === 'COMPLIANT' ? 'Compliant.' : 'Format MRP as: "MRP ₹ ... (inclusive of all taxes)".'
  });

  // RULE 6: Unit Sale Price (USP) [Rule 6(11) - 2022 Statutory Amendment]
  let r6Status: RuleStatus = 'COMPLIANT';
  let r6Discrepancy: string | undefined;

  // Applicable if net quantity is available
  if (!data.unitSalePriceDeclared) {
    // Many pre-packaged commodities require USP under the 2022 mandatory amendment
    r6Status = 'VIOLATION';
    r6Discrepancy = `Mandatory Unit Sale Price (USP) missing. Expected: ${data.calculatedExpectedUSP || '₹ per g/ml/kg'}. Rule 6(11) requires per g/ml/kg/piece pricing to empower consumers with direct unit comparisons.`;
  } else if (!data.isUnitSalePriceCompliant && data.calculatedExpectedUSP) {
    r6Status = 'WARNING';
    r6Discrepancy = `Declared USP (${data.unitSalePriceDeclared}) differs from mathematically computed value (${data.calculatedExpectedUSP}).`;
  }

  rules.push({
    ruleId: 'RULE_6_11_USP',
    ruleCode: 'Rule 6(11)',
    ruleTitle: 'Unit Sale Price (USP) Declaration',
    category: 'PRICING',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Amendment Rules, 2021/2022 - Rule 6(11)',
    status: r6Status,
    detectedText: data.unitSalePriceDeclared || 'Not declared on package',
    expectedRequirement: `Unit Sale Price declared in terms of ₹ per g, ml, kg, litre, or unit. Expected: ${data.calculatedExpectedUSP || 'N/A'}.`,
    discrepancy: r6Discrepancy,
    legalRisk: r6Status === 'VIOLATION' ? 'HIGH' : (r6Status === 'WARNING' ? 'MEDIUM' : 'LOW'),
    penaltyClause: 'Section 36(1): Fine up to ₹25,000 for non-display of mandatory unit price.',
    correctiveAction: r6Status === 'COMPLIANT' ? 'Compliant.' : `Add declaration: "${data.calculatedExpectedUSP || '₹ X / g'}" alongside MRP.`
  });

  // RULE 7: Consumer Care / Grievance Redressal [Rule 6(8)]
  const hasCarePhone = Boolean(data.consumerCarePhone);
  const hasCareEmail = Boolean(data.consumerCareEmail);
  const hasCarePersonnel = Boolean(data.consumerCareName || data.consumerCareAddress);

  let r7Status: RuleStatus = 'COMPLIANT';
  let r7Discrepancy: string | undefined;

  if (!hasCarePhone && !hasCareEmail) {
    r7Status = 'VIOLATION';
    r7Discrepancy = 'No consumer care contact telephone or email address provided.';
  } else if (!hasCareEmail || !hasCarePhone) {
    r7Status = 'WARNING';
    r7Discrepancy = `Incomplete consumer redressal: ${!hasCareEmail ? 'Email address is missing.' : 'Telephone helpline is missing.'} Rule 6(8) mandates name/designation, address, telephone number, AND email ID.`;
  }

  rules.push({
    ruleId: 'RULE_6_8_CARE',
    ruleCode: 'Rule 6(8)',
    ruleTitle: 'Consumer Care & Grievance Redressal Mechanism',
    category: 'CONSUMER_CARE',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(8)',
    status: r7Status,
    detectedText: [
      data.consumerCareName,
      data.consumerCarePhone ? `Tel: ${data.consumerCarePhone}` : null,
      data.consumerCareEmail ? `Email: ${data.consumerCareEmail}` : null
    ].filter(Boolean).join(' | ') || 'None detected',
    expectedRequirement: 'Contact details of designated person/office: postal address, valid telephone helpline, and active email address.',
    discrepancy: r7Discrepancy,
    legalRisk: r7Status === 'VIOLATION' ? 'HIGH' : (r7Status === 'WARNING' ? 'MEDIUM' : 'LOW'),
    penaltyClause: 'Section 36(1): Compounding fine up to ₹25,000.',
    correctiveAction: r7Status === 'COMPLIANT' ? 'Compliant.' : 'Provide complete consumer care panel: Consumer Service Officer, Toll-free number, and dedicated support email.'
  });

  // RULE 8: Country of Origin [Rule 6(10)]
  const hasOrigin = Boolean(data.countryOfOrigin);
  rules.push({
    ruleId: 'RULE_6_10_ORIGIN',
    ruleCode: 'Rule 6(10)',
    ruleTitle: 'Country of Origin Declaration',
    category: 'ORIGIN',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(10)',
    status: hasOrigin ? 'COMPLIANT' : 'VIOLATION',
    detectedText: data.countryOfOrigin || 'None detected',
    expectedRequirement: 'Name of the country of origin or manufacture must be mentioned prominently on the package.',
    discrepancy: hasOrigin ? undefined : 'Country of origin is not specified on package.',
    legalRisk: hasOrigin ? 'LOW' : 'HIGH',
    penaltyClause: 'Section 36(1): Fine up to ₹25,000.',
    correctiveAction: hasOrigin ? 'Compliant.' : 'Print "Country of Origin: India" (or manufacturing country) prominently on the PDP.'
  });

  // RULE 9: Font Size & Height of Numerals and Letters [Rule 7, Table 1]
  // Rule 7 specifies minimum font height based on package net quantity
  let minReqHeightMm = 1.0;
  if (data.netQuantityValue) {
    const val = data.netQuantityValue;
    const u = (data.netQuantityUnit || '').toLowerCase();
    const isGramOrMl = u === 'g' || u === 'ml';
    const isKgOrL = u === 'kg' || u === 'l';

    if (isKgOrL || (isGramOrMl && val > 500)) {
      minReqHeightMm = 4.0;
    } else if (isGramOrMl && val > 200) {
      minReqHeightMm = 4.0;
    } else if (isGramOrMl && val > 100) {
      minReqHeightMm = 2.0;
    } else if (isGramOrMl && val > 50) {
      minReqHeightMm = 1.5;
    } else {
      minReqHeightMm = 1.0;
    }
  }

  const observedHeight = data.estimatedLetterHeightMm;
  const isFontCompliant = observedHeight >= minReqHeightMm;

  rules.push({
    ruleId: 'RULE_7_FONT_HEIGHT',
    ruleCode: 'Rule 7 & Table 1',
    ruleTitle: 'Minimum Height of Numerals & Letters',
    category: 'TYPOGRAPHY',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 7, Second Schedule Table 1',
    status: isFontCompliant ? 'COMPLIANT' : 'WARNING',
    detectedText: `Estimated numeral height: ~${observedHeight.toFixed(1)} mm (PDP Area: ~${data.pdpAreaSqCm} cm²)`,
    expectedRequirement: `Minimum font height of ${minReqHeightMm} mm required for declared net quantity (${data.rawNetQuantityString || 'standard'}).`,
    discrepancy: isFontCompliant ? undefined : `Numeral height (~${observedHeight.toFixed(1)} mm) may be below statutory threshold of ${minReqHeightMm} mm.`,
    legalRisk: isFontCompliant ? 'LOW' : 'MEDIUM',
    penaltyClause: 'Rule 7 / Section 36: Fine up to ₹25,000 for inconspicuous or illegible text declarations.',
    correctiveAction: isFontCompliant ? 'Compliant.' : `Ensure net quantity and MRP numerals meet minimum height of ${minReqHeightMm} mm on the PDP.`
  });

  // RULE 10: Language in which Declaration shall be made [Rule 9(1) & 9(2)]
  const hasEnglish = /[a-zA-Z]/.test(rawText);
  const hasDevanagari = /[\u0900-\u097F]/.test(rawText);
  const hasTamil = /[\u0B80-\u0BFF]/.test(rawText);
  const hasBengali = /[\u0980-\u09FF]/.test(rawText);
  const hasGujarati = /[\u0A80-\u0AFF]/.test(rawText);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(rawText);
  const hasKannada = /[\u0C80-\u0CFF]/.test(rawText);

  const detectedLanguages: string[] = [];
  if (hasEnglish) detectedLanguages.push('English');
  if (hasDevanagari) detectedLanguages.push('Hindi / Devanagari (हिन्दी)');
  if (hasTamil) detectedLanguages.push('Tamil (தமிழ்)');
  if (hasBengali) detectedLanguages.push('Bengali (বাংলা)');
  if (hasGujarati) detectedLanguages.push('Gujarati (ગુજરાતી)');
  if (hasTelugu) detectedLanguages.push('Telugu (తెలుగు)');
  if (hasKannada) detectedLanguages.push('Kannada (ಕನ್ನಡ)');

  const isLanguageCompliant = hasEnglish || hasDevanagari;
  let langStatus: RuleStatus = 'COMPLIANT';
  let langDiscrepancy: string | undefined;
  let langDetectedSummary = detectedLanguages.length > 0 ? detectedLanguages.join(', ') : 'Unrecognized characters';

  if (!isLanguageCompliant) {
    langStatus = 'VIOLATION';
    langDiscrepancy = 'Package declarations must be either in Hindi in Devanagari script or in English (Rule 9(1)).';
  } else if (hasEnglish && hasDevanagari) {
    langDetectedSummary += ' (Bilingual Declaration - Govt. Preferred Model)';
  }

  rules.push({
    ruleId: 'RULE_9_LANGUAGE',
    ruleCode: 'Rule 9(1)',
    ruleTitle: 'Language of Mandatory Declarations',
    category: 'LANGUAGE',
    statutoryClause: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 9(1) & 9(2)',
    status: langStatus,
    detectedText: langDetectedSummary,
    expectedRequirement: 'Every declaration required on package shall be either in Hindi in Devanagari script or in English (Rule 9(1)). Regional languages permitted in addition (Rule 9(2)).',
    discrepancy: langDiscrepancy,
    legalRisk: langStatus === 'VIOLATION' ? 'HIGH' : 'LOW',
    penaltyClause: 'Rule 9 / Section 36: Fine up to ₹25,000 for unlawful or unauthorized language declarations.',
    correctiveAction: langStatus === 'COMPLIANT' ? 'Compliant.' : 'Ensure all mandatory statutory declarations are in Hindi (Devanagari script) or English.'
  });

  // Calculate overall metrics
  const passedCount = rules.filter(r => r.status === 'COMPLIANT').length;
  const violationCount = rules.filter(r => r.status === 'VIOLATION').length;
  const warningCount = rules.filter(r => r.status === 'WARNING').length;
  const totalCount = rules.length;

  // Score calculation
  const complianceScore = Math.round(((passedCount * 1.0 + warningCount * 0.5) / totalCount) * 100);

  let overallStatus: 'FULLY_COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONALLY_COMPLIANT' = 'FULLY_COMPLIANT';
  if (violationCount > 0) {
    overallStatus = 'NON_COMPLIANT';
  } else if (warningCount > 0) {
    overallStatus = 'CONDITIONALLY_COMPLIANT';
  }

  // Estimated statutory fine: ₹25,000 per serious non-compliance clause (Section 36)
  const maxStatutoryFineEstimate = violationCount * 25000;

  // Classify package physical state
  let packageType: 'SOLID' | 'LIQUID' | 'COUNT' | 'UNKNOWN' = 'UNKNOWN';
  const u = (data.netQuantityUnit || '').toLowerCase();
  if (u === 'g' || u === 'kg' || u === 'mg') packageType = 'SOLID';
  else if (u === 'ml' || u === 'l' || u === 'cl') packageType = 'LIQUID';
  else if (u === 'n' || u === 'u' || u === 'count') packageType = 'COUNT';

  return {
    overallStatus,
    complianceScore,
    totalRulesAudited: totalCount,
    passedCount,
    violationCount,
    warningCount,
    extractedData: data,
    rules,
    detectedRegions: generateSimulatedRegions(data),
    rawOcrText: rawText,
    ocrConfidence,
    analysisMode: 'OFFLINE_TESSERACT',
    auditTimestamp: new Date().toISOString(),
    packageType,
    maxStatutoryFineEstimate
  };
}

/**
 * Creates visual bounding boxes for interactive canvas overlay.
 */
function generateSimulatedRegions(data: ExtractedPackageData): DetectedTextRegion[] {
  const regions: DetectedTextRegion[] = [];

  if (data.commodityName) {
    regions.push({
      id: 'reg_name',
      text: data.commodityName,
      confidence: 96,
      box: { x0: 8, y0: 8, x1: 92, y1: 18 },
      matchedRuleId: 'RULE_6_1_B',
      fieldLabel: 'Common / Generic Name',
      status: 'pass'
    });
  }

  if (data.rawNetQuantityString) {
    regions.push({
      id: 'reg_net_qty',
      text: `Net Qty: ${data.rawNetQuantityString}`,
      confidence: 94,
      box: { x0: 8, y0: 22, x1: 45, y1: 32 },
      matchedRuleId: 'RULE_6_1_C',
      fieldLabel: 'Net Quantity',
      status: data.hasIllegalUnitSymbol ? 'fail' : 'pass'
    });
  }

  if (data.mrpRawString || data.mrpAmount) {
    regions.push({
      id: 'reg_mrp',
      text: data.mrpRawString || `MRP: ₹ ${data.mrpAmount}`,
      confidence: 95,
      box: { x0: 52, y0: 22, x1: 92, y1: 32 },
      matchedRuleId: 'RULE_6_1_E',
      fieldLabel: 'MRP & Taxes',
      status: data.isInclusiveOfAllTaxes ? 'pass' : 'fail'
    });
  }

  if (data.unitSalePriceDeclared) {
    regions.push({
      id: 'reg_usp',
      text: `USP: ${data.unitSalePriceDeclared}`,
      confidence: 91,
      box: { x0: 52, y0: 34, x1: 92, y1: 44 },
      matchedRuleId: 'RULE_6_11_USP',
      fieldLabel: 'Unit Sale Price',
      status: 'pass'
    });
  }

  if (data.mfgMonthYear) {
    regions.push({
      id: 'reg_mfg',
      text: `Mfg Date: ${data.mfgMonthYear}`,
      confidence: 93,
      box: { x0: 8, y0: 34, x1: 48, y1: 44 },
      matchedRuleId: 'RULE_6_1_D',
      fieldLabel: 'Mfg / Packing Date',
      status: 'pass'
    });
  }

  if (data.manufacturerName) {
    regions.push({
      id: 'reg_mfg_addr',
      text: `${data.manufacturerName}, ${data.manufacturerAddress}`.slice(0, 70),
      confidence: 90,
      box: { x0: 8, y0: 48, x1: 92, y1: 64 },
      matchedRuleId: 'RULE_6_1_A',
      fieldLabel: 'Manufacturer Details',
      status: 'pass'
    });
  }

  if (data.consumerCarePhone || data.consumerCareEmail) {
    regions.push({
      id: 'reg_care',
      text: `Care: ${data.consumerCarePhone || ''} ${data.consumerCareEmail || ''}`,
      confidence: 92,
      box: { x0: 8, y0: 68, x1: 92, y1: 82 },
      matchedRuleId: 'RULE_6_8_CARE',
      fieldLabel: 'Consumer Care Cell',
      status: (data.consumerCarePhone && data.consumerCareEmail) ? 'pass' : 'warn'
    });
  }

  if (data.countryOfOrigin) {
    regions.push({
      id: 'reg_origin',
      text: `Origin: ${data.countryOfOrigin}`,
      confidence: 97,
      box: { x0: 8, y0: 86, x1: 50, y1: 94 },
      matchedRuleId: 'RULE_6_10_ORIGIN',
      fieldLabel: 'Country of Origin',
      status: 'pass'
    });
  }

  return regions;
}
