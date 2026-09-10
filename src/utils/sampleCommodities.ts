/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkSample } from '../types/legalMetrology';

// Helper to build realistic SVG product packaging labels
function makePackagingSvg(props: {
  bgGradient: [string, string];
  brand: string;
  product: string;
  badges?: string[];
  lines: Array<{ label?: string; val: string; highlight?: 'green' | 'red' | 'yellow' | 'normal' }>;
  notes?: string;
}): string {
  const { bgGradient, brand, product, badges = [], lines, notes } = props;

  const renderedLines = lines
    .map((l, i) => {
      let color = '#334155';
      let weight = '400';
      if (l.highlight === 'green') {
        color = '#15803d';
        weight = '600';
      } else if (l.highlight === 'red') {
        color = '#b91c1c';
        weight = '700';
      } else if (l.highlight === 'yellow') {
        color = '#b45309';
        weight = '600';
      }
      return `
      <g transform="translate(24, ${180 + i * 28})">
        ${l.label ? `<text x="0" y="0" fill="#64748b" font-family="sans-serif" font-size="12" font-weight="600">${l.label}:</text>` : ''}
        <text x="${l.label ? 160 : 0}" y="0" fill="${color}" font-family="sans-serif" font-size="13" font-weight="${weight}">${l.val}</text>
      </g>
    `;
    })
    .join('');

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="520" viewBox="0 0 600 520">
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}"/>
        <stop offset="100%" stop-color="${bgGradient[1]}"/>
      </linearGradient>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.12"/>
      </filter>
    </defs>

    <!-- Outer Packaging Canvas -->
    <rect width="600" height="520" fill="#f8fafc"/>

    <!-- Package Card Container -->
    <rect x="20" y="20" width="560" height="480" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" filter="url(#cardShadow)"/>

    <!-- Package Top Header Banner -->
    <rect x="20" y="20" width="560" height="110" rx="16" fill="url(#headerGrad)"/>
    <!-- Banner bottom crop mask -->
    <rect x="20" y="110" width="560" height="20" fill="url(#headerGrad)"/>

    <!-- Brand Name -->
    <text x="44" y="65" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="800" letter-spacing="0.5">${brand}</text>
    <text x="44" y="96" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="600" opacity="0.95">${product}</text>

    <!-- Top Corner Badge -->
    ${badges.map((b, idx) => `
      <g transform="translate(${440 - idx * 110}, 45)">
        <rect width="95" height="26" rx="13" fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-width="1"/>
        <text x="47" y="17" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="700" text-anchor="middle">${b}</text>
      </g>
    `).join('')}

    <!-- Principal Display Panel (PDP) Declarations -->
    <text x="44" y="152" fill="#0f172a" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="1">STATUTORY DECLARATIONS [LMPC RULES, 2011]</text>
    <line x1="44" y1="162" x2="556" y2="162" stroke="#e2e8f0" stroke-width="1"/>

    ${renderedLines}

    <!-- Footer Seal / Barcode -->
    <rect x="44" y="445" width="512" height="40" rx="8" fill="#f1f5f9"/>
    <text x="56" y="470" fill="#64748b" font-family="monospace" font-size="11">||| |||| ||||| ||||||| ||| |||| 8901234567891</text>
    <text x="400" y="470" fill="#475569" font-family="sans-serif" font-size="11" font-weight="600">${notes || 'Standard Retail Pack'}</text>
  </svg>
  `.trim();

  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      const utf8Bytes = new TextEncoder().encode(svg);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      return `data:image/svg+xml;base64,${window.btoa(binary)}`;
    }
  } catch {
    // fallback
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const BENCHMARK_COMMODITY_SAMPLES: BenchmarkSample[] = [
  {
    id: 'sample_biscuits_compliant',
    name: 'SunFeast Butter Cookies (200g)',
    category: 'FMCG Food Pack',
    thumbnailBadge: '100% Compliant',
    description: 'Gold standard FMCG package with full S.I. units (g), Unit Sale Price (USP), inclusive MRP, PIN code, and complete 4-tier consumer grievance care.',
    expectedCompliance: 'COMPLIANT',
    imageSrc: makePackagingSvg({
      bgGradient: ['#047857', '#065f46'],
      brand: 'SunFeast Royal Delights',
      product: 'Crispy Butter Cookies (Generic: Biscuits)',
      badges: ['ISI Certified', 'FSSAI Lic'],
      lines: [
        { label: 'Generic Name', val: 'Butter Cookies', highlight: 'green' },
        { label: 'Net Quantity', val: '200 g (Rule 12 Standard SI Unit)', highlight: 'green' },
        { label: 'MRP', val: '₹ 40.00 (inclusive of all taxes)', highlight: 'green' },
        { label: 'Unit Sale Price', val: '₹ 0.20 / g (Rule 6(11) Compliant)', highlight: 'green' },
        { label: 'Mfg / PKD Date', val: '05/2024 (Best Before 6 months from packaging)', highlight: 'green' },
        { label: 'Manufactured by', val: 'Britannia Foods Ltd, Plot 45, Hosur Road, Bengaluru, Karnataka - 560099', highlight: 'green' },
        { label: 'Consumer Care Cell', val: 'Officer - Care, Toll Free: 1800-425-4444, Email: care@sunfeast.in', highlight: 'green' },
        { label: 'Country of Origin', val: 'India', highlight: 'green' },
        { label: 'Batch / Lot No', val: 'LOT-BF-202405A', highlight: 'normal' }
      ],
      notes: 'Govt. Benchmark Compliant Sample'
    }),
    ocrText: `
SunFeast Royal Delights
Generic Name: Butter Cookies
Net Quantity: 200 g
MRP: Rs. 40.00 (inclusive of all taxes)
Unit Sale Price: Rs. 0.20 / g
Mfg Date: 05/2024
Best Before: 6 months from date of packaging
Batch No: LOT-BF-202405A
Manufactured by: Britannia Foods Ltd, Plot 45, Hosur Road, Bengaluru, Karnataka - 560099
Consumer Care Cell: Officer - Care, Toll Free: 1800-425-4444, Email: care@sunfeast.in
Country of Origin: India
    `.trim(),
    extractedData: {
      brandName: 'SunFeast Royal Delights',
      commodityName: 'Butter Cookies',
      netQuantityValue: 200,
      netQuantityUnit: 'g',
      rawNetQuantityString: '200 g',
      hasIllegalUnitSymbol: false,
      mrpAmount: 40.0,
      isInclusiveOfAllTaxes: true,
      unitSalePriceDeclared: '₹ 0.20 / g',
      mfgMonthYear: '05/2024',
      expiryOrBestBefore: '6 months from packaging',
      manufacturerName: 'Britannia Foods Ltd',
      manufacturerAddress: 'Plot 45, Hosur Road, Bengaluru, Karnataka - 560099',
      consumerCareName: 'Officer - Care',
      consumerCarePhone: '1800-425-4444',
      consumerCareEmail: 'care@sunfeast.in',
      countryOfOrigin: 'India',
      batchOrLotNumber: 'LOT-BF-202405A',
      estimatedLetterHeightMm: 3.2
    }
  },
  {
    id: 'sample_cosmetic_font_defect',
    name: 'DermaGlow Herbal Face Cream (50 g)',
    category: 'Cosmetics & Personal Care',
    thumbnailBadge: 'Typography Defect',
    description: 'Cosmetic cream container where font height is sub-standard (<1.0 mm against Rule 7 minimum requirement) and missing manufacturing date stamp.',
    expectedCompliance: 'NON_COMPLIANT',
    imageSrc: makePackagingSvg({
      bgGradient: ['#d97706', '#b45309'],
      brand: 'DermaGlow Botanicals',
      product: 'Herbal Hydrating Face Cream',
      badges: ['Ayurvedic', 'Typography Warning'],
      lines: [
        { label: 'Generic Name', val: 'Face Cream', highlight: 'green' },
        { label: 'Net Content', val: '50 g', highlight: 'green' },
        { label: 'MRP', val: '₹ 249.00 (inclusive of all taxes)', highlight: 'green' },
        { label: 'Unit Sale Price', val: '₹ 4.98 / g', highlight: 'green' },
        { label: 'Mfg Date', val: '[MISSING / UNREADABLE - VIOLATION: Rule 6(1)(d)]', highlight: 'red' },
        { label: 'Numeral Font Height', val: '0.7 mm [VIOLATION: Rule 7 requires min 1.0 mm for 50g]', highlight: 'red' },
        { label: 'Manufactured by', val: 'DermaGlow Herbals, Sector 12, Gurugram, Haryana - 122001', highlight: 'green' },
        { label: 'Consumer Support', val: 'Toll-Free: 1800-333-777, help@dermaglow.co.in', highlight: 'green' },
        { label: 'Country of Origin', val: 'India', highlight: 'green' }
      ],
      notes: 'Inconspicuous Font Size Violation'
    }),
    ocrText: `
DermaGlow Botanicals
Herbal Hydrating Face Cream
Generic Name: Face Cream
Net Content: 50 g
MRP: Rs. 249.00 (inclusive of all taxes)
Unit Sale Price: Rs. 4.98 / g
Manufactured by: DermaGlow Herbals, Sector 12, Gurugram, Haryana - 122001
Consumer Support: Toll-Free: 1800-333-777, help@dermaglow.co.in
Country of Origin: India
Batch: DG-50G-24
    `.trim(),
    extractedData: {
      brandName: 'DermaGlow Botanicals',
      commodityName: 'Face Cream',
      netQuantityValue: 50,
      netQuantityUnit: 'g',
      rawNetQuantityString: '50 g',
      hasIllegalUnitSymbol: false,
      mrpAmount: 249.0,
      isInclusiveOfAllTaxes: true,
      unitSalePriceDeclared: '₹ 4.98 / g',
      mfgMonthYear: '',
      manufacturerName: 'DermaGlow Herbals',
      manufacturerAddress: 'Sector 12, Gurugram, Haryana - 122001',
      consumerCarePhone: '1800-333-777',
      consumerCareEmail: 'help@dermaglow.co.in',
      countryOfOrigin: 'India',
      batchOrLotNumber: 'DG-50G-24',
      estimatedLetterHeightMm: 0.7
    }
  },
  {
    id: 'sample_rice_5kg_compliant',
    name: 'Kohinoor Royal Basmati Rice (5 kg)',
    category: 'Grains & Pulses',
    thumbnailBadge: 'Full Compliance',
    description: 'Heavy grain sack (>1 kg) demonstrating correct Unit Sale Price in terms of ₹ per kg, standard SI unit (kg), full packer registration and customer grievance office.',
    expectedCompliance: 'COMPLIANT',
    imageSrc: makePackagingSvg({
      bgGradient: ['#1e40af', '#1e3a8a'],
      brand: 'Kohinoor Royal Reserve',
      product: 'Aged Long Grain Basmati Rice',
      badges: ['Premium Quality', 'ISO 22000'],
      lines: [
        { label: 'Generic Name', val: 'Basmati Rice', highlight: 'green' },
        { label: 'Net Quantity', val: '5 kg (Rule 12 Standard SI Unit)', highlight: 'green' },
        { label: 'MRP', val: '₹ 675.00 (inclusive of all taxes)', highlight: 'green' },
        { label: 'Unit Sale Price', val: '₹ 135.00 / kg (Rule 6(11) Compliant)', highlight: 'green' },
        { label: 'Date of Packing', val: 'PKD: 03/2024 (Best before 24 months)', highlight: 'green' },
        { label: 'Packed by', val: 'Kohinoor Speciality Foods Ltd, G.T. Road, Sonepat, Haryana - 131021', highlight: 'green' },
        { label: 'Consumer Care Cell', val: 'Customer Care Head, Tel: 1800-180-2222, Email: customercare@kohinoorfoods.in', highlight: 'green' },
        { label: 'Country of Origin', val: 'India', highlight: 'green' },
        { label: 'Batch No', val: 'LOT-KBR-5K-88', highlight: 'normal' }
      ],
      notes: 'Packaged Commodities Rule 6(11) Reference'
    }),
    ocrText: `
Kohinoor Royal Reserve
Aged Long Grain Basmati Rice
Generic Name: Basmati Rice
Net Quantity: 5 kg
MRP: Rs. 675.00 (inclusive of all taxes)
Unit Sale Price: Rs. 135.00 / kg
Date of Packing: 03/2024
Best Before: 24 months from packaging
Packed by: Kohinoor Speciality Foods Ltd, G.T. Road, Sonepat, Haryana - 131021
Consumer Care Cell: Customer Care Head, Tel: 1800-180-2222, Email: customercare@kohinoorfoods.in
Country of Origin: India
Batch No: LOT-KBR-5K-88
    `.trim(),
    extractedData: {
      brandName: 'Kohinoor Royal Reserve',
      commodityName: 'Basmati Rice',
      netQuantityValue: 5,
      netQuantityUnit: 'kg',
      rawNetQuantityString: '5 kg',
      hasIllegalUnitSymbol: false,
      mrpAmount: 675.0,
      isInclusiveOfAllTaxes: true,
      unitSalePriceDeclared: '₹ 135.00 / kg',
      mfgMonthYear: '03/2024',
      expiryOrBestBefore: '24 months from packaging',
      manufacturerName: 'Kohinoor Speciality Foods Ltd',
      manufacturerAddress: 'G.T. Road, Sonepat, Haryana - 131021',
      consumerCareName: 'Customer Care Head',
      consumerCarePhone: '1800-180-2222',
      consumerCareEmail: 'customercare@kohinoorfoods.in',
      countryOfOrigin: 'India',
      batchOrLotNumber: 'LOT-KBR-5K-88',
      estimatedLetterHeightMm: 4.8
    }
  },
  {
    id: 'sample_bilingual_atta_compliant',
    name: 'Bilingual Shuddha Chakki Atta / शुद्ध चक्की आटा (5 kg)',
    category: 'Staples & Bilingual Commodity',
    thumbnailBadge: 'Bilingual (Rule 9)',
    description: 'Exemplary bilingual retail package declaring all statutory particulars in both Hindi (Devanagari) and English as prescribed under Rule 9(1) of LMPC Rules 2011.',
    expectedCompliance: 'COMPLIANT',
    imageSrc: makePackagingSvg({
      bgGradient: ['#b45309', '#78350f'],
      brand: 'Annapurna Shuddha / अन्नपूर्णा शुद्ध',
      product: 'Chakki Fresh Wheat Flour / शुद्ध गेहूं का आटा',
      badges: ['100% Whole Wheat', 'द्विभाषी घोषणा / Bilingual (Rule 9)'],
      lines: [
        { label: 'उत्पाद / Product', val: 'Whole Wheat Atta / शुद्ध गेहूं का आटा', highlight: 'green' },
        { label: 'शुद्ध मात्रा / Net Qty', val: '5 kg (Rule 12 Standard SI Unit)', highlight: 'green' },
        { label: 'MRP / अधिकतम मूल्य', val: '₹ 245.00 (सभी कर सहित / incl. of all taxes)', highlight: 'green' },
        { label: 'इकाई विक्रय मूल्य / USP', val: '₹ 49.00 / kg (Rule 6(11) Compliant)', highlight: 'green' },
        { label: 'निर्माण / Mfg Date', val: '02/2025 (Best before 4 months)', highlight: 'green' },
        { label: 'निर्माता / Packer', val: 'Annapurna Agro Foods Ltd, Phase-2, Noida, Uttar Pradesh - 201305', highlight: 'green' },
        { label: 'उपभोक्ता सेवा / Support', val: 'टोल-फ्री: 1800-222-3344, care@annapurnaagro.in', highlight: 'green' },
        { label: 'मूल देश / Origin', val: 'भारत / India', highlight: 'green' },
        { label: 'बैच / Batch', val: 'B-NO-ATT-5KG-09', highlight: 'normal' }
      ],
      notes: 'LMPC Rule 9(1) Bilingual Compliance Model'
    }),
    ocrText: `
Annapurna Shuddha / अन्नपूर्णा शुद्ध
Chakki Fresh Wheat Flour / शुद्ध गेहूं का आटा
उत्पाद / Product: Whole Wheat Atta / शुद्ध गेहूं का आटा
शुद्ध मात्रा / Net Quantity: 5 kg
अधिकतम खुदरा मूल्य / MRP: Rs. 245.00 (सभी कर सहित / incl. of all taxes)
इकाई विक्रय मूल्य / Unit Sale Price: Rs. 49.00 / kg
निर्माण माह / Mfg Date: 02/2025
Best Before: 4 months from packing
निर्माता / Packed by: Annapurna Agro Foods Ltd, Phase-2, Noida, Uttar Pradesh - 201305
उपभोक्ता सेवा / Consumer Care: Toll-Free: 1800-222-3344, care@annapurnaagro.in
मूल देश / Country of Origin: भारत / India
बैच संख्या / Batch: B-NO-ATT-5KG-09
    `.trim(),
    extractedData: {
      brandName: 'Annapurna Shuddha / अन्नपूर्णा शुद्ध',
      commodityName: 'Whole Wheat Atta / गेहूं का आटा',
      netQuantityValue: 5,
      netQuantityUnit: 'kg',
      rawNetQuantityString: '5 kg',
      hasIllegalUnitSymbol: false,
      mrpAmount: 245.0,
      isInclusiveOfAllTaxes: true,
      unitSalePriceDeclared: '₹ 49.00 / kg',
      mfgMonthYear: '02/2025',
      expiryOrBestBefore: '4 months from packing',
      manufacturerName: 'Annapurna Agro Foods Ltd',
      manufacturerAddress: 'Phase-2, Noida, Uttar Pradesh - 201305',
      consumerCareName: 'Consumer Care Cell',
      consumerCarePhone: '1800-222-3344',
      consumerCareEmail: 'care@annapurnaagro.in',
      countryOfOrigin: 'India',
      batchOrLotNumber: 'B-NO-ATT-5KG-09',
      estimatedLetterHeightMm: 4.5
    }
  }
];
