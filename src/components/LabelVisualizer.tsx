/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  DetectedTextRegion,
  ComplianceReport
} from '../types/legalMetrology';
import {
  Eye,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { preprocessImage } from '../utils/offlineOcr';

interface LabelVisualizerProps {
  imageSrc: string;
  report: ComplianceReport | null;
  selectedRegionId?: string;
  onSelectRegion?: (region: DetectedTextRegion | null) => void;
  isProcessing?: boolean;
}

export const LabelVisualizer: React.FC<LabelVisualizerProps> = ({
  imageSrc,
  report,
  selectedRegionId,
  onSelectRegion,
  isProcessing
}) => {
  const [filterMode, setFilterMode] = useState<'original' | 'contrast' | 'binarize' | 'grayscale'>('original');
  const [displayImage, setDisplayImage] = useState<string>(imageSrc);
  const [zoom, setZoom] = useState<number>(1);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [hoveredRegion, setHoveredRegion] = useState<DetectedTextRegion | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update display image when filter changes
  useEffect(() => {
    let isCancelled = false;
    async function applyFilter() {
      if (filterMode === 'original') {
        setDisplayImage(imageSrc);
        return;
      }
      try {
        const filtered = await preprocessImage(imageSrc, filterMode);
        if (!isCancelled && filtered) {
          setDisplayImage(filtered);
        }
      } catch (e) {
        console.warn('Filter preprocessing fallback:', e);
        if (!isCancelled) setDisplayImage(imageSrc);
      }
    }
    applyFilter();
    return () => {
      isCancelled = true;
    };
  }, [imageSrc, filterMode]);

  // Reset zoom on new image
  useEffect(() => {
    setZoom(1);
  }, [imageSrc]);

  const regions = report?.detectedRegions || [];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-slate-100">
      {/* Visualizer Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">PDP Inspector</span>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
            {report?.packageType || 'COMMODITY'}
          </span>
          {report && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              {regions.length} zones mapped
            </span>
          )}
        </div>

        {/* Filters and Zoom Controls */}
        <div className="flex items-center gap-1.5">
          {/* Preprocessing Filter Buttons */}
          <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
            <button
              id="filter-original"
              type="button"
              onClick={() => setFilterMode('original')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filterMode === 'original' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Original Color Label"
            >
              Original
            </button>
            <button
              id="filter-contrast"
              type="button"
              onClick={() => setFilterMode('contrast')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filterMode === 'contrast' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Preprocessed High Contrast (Enhanced OCR Readability)"
            >
              Contrast+
            </button>
            <button
              id="filter-binarize"
              type="button"
              onClick={() => setFilterMode('binarize')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filterMode === 'binarize' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Binarized Threshold (Computer Vision Otsu Filter)"
            >
              Binarized
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Toggle Overlays */}
          <button
            id="toggle-overlays"
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 ${
              showOverlays
                ? 'bg-slate-800 text-indigo-300 border-indigo-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Bounding Boxes"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Zones</span>
          </button>

          {/* Zoom Buttons */}
          <button
            id="zoom-out-btn"
            type="button"
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-9 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            id="zoom-in-btn"
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="reset-zoom-btn"
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[380px] max-h-[560px] overflow-auto flex items-center justify-center p-4 bg-slate-950/90 select-none"
      >
        <div
          className="relative transition-transform duration-150 ease-out origin-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Packaging Image */}
          <img
            src={displayImage}
            alt="Scanned Packaged Commodity Label"
            className="max-h-[480px] w-auto max-w-full rounded-lg shadow-2xl border border-slate-800 object-contain block"
          />

          {/* Processing Spinner Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center rounded-lg z-30">
              <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-sm font-semibold text-indigo-300">Extracting Typography & SI Units...</div>
              <div className="text-xs text-slate-400 mt-1">Applying Legal Metrology 2011 Heuristics</div>
            </div>
          )}

          {/* Interactive Bounding Boxes Overlay */}
          {showOverlays && !isProcessing && (
            <div className="absolute inset-0 pointer-events-auto">
              {regions.map((reg) => {
                const isSelected = reg.id === selectedRegionId;
                const isHovered = reg.id === hoveredRegion?.id;

                let borderStyle = 'border-slate-400 bg-slate-500/10 text-slate-300';
                if (reg.status === 'pass') {
                  borderStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-300';
                } else if (reg.status === 'fail') {
                  borderStyle = 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse';
                } else if (reg.status === 'warn') {
                  borderStyle = 'border-amber-500 bg-amber-500/15 text-amber-300';
                }

                return (
                  <div
                    key={reg.id}
                    id={`bbox-${reg.id}`}
                    onClick={() => onSelectRegion?.(isSelected ? null : reg)}
                    onMouseEnter={() => setHoveredRegion(reg)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    style={{
                      left: `${reg.box.x0}%`,
                      top: `${reg.box.y0}%`,
                      width: `${Math.max(4, reg.box.x1 - reg.box.x0)}%`,
                      height: `${Math.max(3, reg.box.y1 - reg.box.y0)}%`
                    }}
                    className={`absolute cursor-pointer border-2 rounded transition-all duration-150 group ${borderStyle} ${
                      isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900 z-20' : 'z-10'
                    } ${isHovered ? 'scale-[1.02] shadow-lg' : ''}`}
                  >
                    {/* Floating Pill Label */}
                    <div className="absolute -top-5 left-0 whitespace-nowrap bg-slate-900/90 backdrop-blur-xs text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      {reg.fieldLabel || 'Zone'}: {reg.text.slice(0, 24)}...
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Visualizer Status Footer / Tooltip */}
      <div className="px-4 py-2 bg-slate-950/95 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {hoveredRegion ? (
            <span className="truncate">
              <strong className="text-slate-200">{hoveredRegion.fieldLabel}:</strong> {hoveredRegion.text}
            </span>
          ) : (
            <span>Hover or click marked zones on the label to inspect statutory declarations</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Compliant
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Violation
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning
          </span>
        </div>
      </div>
    </div>
  );
};
