/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExtractedPackageData } from '../types/legalMetrology';
import {
  X,
  RefreshCw,
  Sliders,
  Check,
  HelpCircle
} from 'lucide-react';

interface ManualCorrectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExtractedPackageData;
  onSave: (updated: ExtractedPackageData) => void;
}

export const ManualCorrectionDrawer: React.FC<ManualCorrectionDrawerProps> = ({
  isOpen,
  onClose,
  data,
  onSave
}) => {
  const [formData, setFormData] = useState<ExtractedPackageData>({ ...data });

  if (!isOpen) return null;

  const handleChange = (field: keyof ExtractedPackageData, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-slate-900 text-slate-100 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Inspector Field Verification</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed text-[11px]">
            If packaging reflection or creases impaired OCR text recognition, verify or correct the parsed fields below. The LMPC 2011 compliance score will re-evaluate in real time.
          </p>

          {/* Commodity & Brand */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 block">Generic / Common Name (Rule 6(1)(b))</label>
            <input
              type="text"
              value={formData.commodityName}
              onChange={(e) => handleChange('commodityName', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Butter Cookies, Refined Sunflower Oil"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300 block">Brand Identity</label>
            <input
              type="text"
              value={formData.brandName || ''}
              onChange={(e) => handleChange('brandName', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Britannia, Kohinoor, Annapurna"
            />
          </div>

          {/* Net Quantity & SI Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 block">Net Qty Value</label>
              <input
                type="number"
                step="any"
                value={formData.netQuantityValue ?? ''}
                onChange={(e) => handleChange('netQuantityValue', parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="200"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 block">Unit Symbol (Standard SI)</label>
              <input
                type="text"
                value={formData.netQuantityUnit}
                onChange={(e) => {
                  const val = e.target.value;
                  const isIllegal = ['gms', 'gm', 'kgs', 'ltrs', 'pcs'].includes(val.toLowerCase());
                  handleChange('netQuantityUnit', val);
                  handleChange('hasIllegalUnitSymbol', isIllegal);
                  if (isIllegal) handleChange('illegalUnitDetected', val);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="g, kg, ml, l, N"
              />
            </div>
          </div>

          {/* MRP & Tax Inclusivity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 block">MRP (₹)</label>
              <input
                type="number"
                step="any"
                value={formData.mrpAmount ?? ''}
                onChange={(e) => handleChange('mrpAmount', parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="40.00"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 block">Unit Sale Price (USP)</label>
              <input
                type="text"
                value={formData.unitSalePriceDeclared}
                onChange={(e) => handleChange('unitSalePriceDeclared', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="₹ 0.20 / g"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2">
            <input
              id="tax-incl-checkbox"
              type="checkbox"
              checked={formData.isInclusiveOfAllTaxes}
              onChange={(e) => handleChange('isInclusiveOfAllTaxes', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
            />
            <label htmlFor="tax-incl-checkbox" className="text-xs text-slate-300 font-medium cursor-pointer">
              Label specifies &quot;inclusive of all taxes&quot; (Rule 6(1)(e))
            </label>
          </div>

          {/* Mfg Date */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 block">Month & Year of Mfg/PKD (Rule 6(1)(d))</label>
            <input
              type="text"
              value={formData.mfgMonthYear}
              onChange={(e) => handleChange('mfgMonthYear', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. 05/2024 or May 2024"
            />
          </div>

          {/* Manufacturer Details */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 block">Manufacturer / Packer Name</label>
            <input
              type="text"
              value={formData.manufacturerName}
              onChange={(e) => handleChange('manufacturerName', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Britannia Industries Ltd"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300 block">Manufacturer Complete Address (incl. PIN Code)</label>
            <textarea
              rows={2}
              value={formData.manufacturerAddress}
              onChange={(e) => handleChange('manufacturerAddress', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Plot 45, Hosur Road, Bengaluru, Karnataka - 560099"
            />
          </div>

          {/* Consumer Care */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 block">Consumer Care Phone</label>
              <input
                type="text"
                value={formData.consumerCarePhone}
                onChange={(e) => handleChange('consumerCarePhone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="1800-425-4444"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300 block">Consumer Care Email</label>
              <input
                type="email"
                value={formData.consumerCareEmail}
                onChange={(e) => handleChange('consumerCareEmail', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="care@sunfeast.in"
              />
            </div>
          </div>

          {/* Country of Origin */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 block">Country of Origin (Rule 6(10))</label>
            <input
              type="text"
              value={formData.countryOfOrigin}
              onChange={(e) => handleChange('countryOfOrigin', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="India"
            />
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalculate LMPC Compliance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
