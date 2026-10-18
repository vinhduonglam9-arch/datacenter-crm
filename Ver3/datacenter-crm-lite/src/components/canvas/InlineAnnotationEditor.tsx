import React, { useEffect, useRef } from 'react';
import { CanvasAnnotation } from '../../types/crm.ts';
import { computeStickyCalloutGeometry } from '../../utils/graph-math.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { STICKY_BG_PALETTE } from './canvas-constants.ts';

interface StickyNoteInlineEditorProps {
  ann: CanvasAnnotation;
  defaultStampLabel: string;
  displayAccentColor: string;
  displayBgColor: string;
  onUpdateAnnotation?: (id: string, updates: Partial<CanvasAnnotation>) => void;
  onFinishEditing: () => void;
}

export const StickyNoteInlineEditor: React.FC<StickyNoteInlineEditorProps> = React.memo(
  ({
    ann,
    defaultStampLabel,
    displayAccentColor,
    displayBgColor,
    onUpdateAnnotation,
    onFinishEditing,
  }) => {
    const { language } = useLanguage();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, []);

    return (
      <div className="space-y-2" onMouseDown={(e) => e.stopPropagation()}>
        {/* Custom Stamp Label & Colors inline editor */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={ann.stampLabel ?? defaultStampLabel}
            onChange={(e) => onUpdateAnnotation?.(ann.id, { stampLabel: e.target.value })}
            placeholder={language === 'zh' ? '自定义印章标签…' : 'Custom stamp label...'}
            className="flex-1 min-w-0 bg-white/90 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <label
            className="w-5 h-5 rounded border border-slate-300 cursor-pointer shrink-0 shadow-2xs"
            style={{ backgroundColor: displayAccentColor }}
            title={language === 'zh' ? '印章与边框颜色' : 'Stamp Color'}
          >
            <input
              type="color"
              value={displayAccentColor}
              onChange={(e) => onUpdateAnnotation?.(ann.id, { color: e.target.value })}
              className="opacity-0 w-0 h-0"
            />
          </label>
          <label
            className="w-5 h-5 rounded border border-slate-300 cursor-pointer shrink-0 shadow-2xs"
            style={{ backgroundColor: displayBgColor }}
            title={language === 'zh' ? '便签纸背景色' : 'Paper Background'}
          >
            <input
              type="color"
              value={displayBgColor}
              onChange={(e) => onUpdateAnnotation?.(ann.id, { bgColor: e.target.value })}
              className="opacity-0 w-0 h-0"
            />
          </label>
        </div>

        {/* Callout Leader Line Style & Corner Vertex Editor in Inline Editor */}
        <div className="flex flex-col gap-1 bg-white/70 px-1.5 py-1 rounded">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] text-slate-500">
              {language === 'zh' ? '引出线:' : 'Callout:'}
            </span>
            <div className="flex items-center gap-1">
              {[
                { key: 'none' as const, label: language === 'zh' ? '无' : 'None' },
                { key: 'solid' as const, label: language === 'zh' ? '实线' : 'Solid' },
                { key: 'dashed' as const, label: language === 'zh' ? '虚线' : 'Dashed' },
              ].map((opt) => {
                const activeMode = !ann.calloutEnabled
                  ? 'none'
                  : ann.calloutStyle === 'dashed'
                  ? 'dashed'
                  : 'solid';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (opt.key === 'none') {
                        onUpdateAnnotation?.(ann.id, { calloutEnabled: false });
                      } else {
                        onUpdateAnnotation?.(ann.id, {
                          calloutEnabled: true,
                          calloutStyle: opt.key,
                          calloutStartNorm: ann.calloutStartNorm || { x: 0, y: 1 },
                          calloutOffsetX: ann.calloutOffsetX ?? -85,
                          calloutOffsetY:
                            ann.calloutOffsetY ?? Math.round(ann.height + 48),
                        });
                      }
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold cursor-pointer ${
                      activeMode === opt.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          {ann.calloutEnabled && (
            <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200/60">
              <span className="text-[9px] text-slate-500">
                {language === 'zh' ? '折角点:' : 'Corners:'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const geom = computeStickyCalloutGeometry(ann);
                    const mid = geom.segmentMidpoints[0];
                    if (mid) {
                      const nextElbows = [...geom.elbowOffsets];
                      nextElbows.splice(mid.insertIndex, 0, {
                        x: Math.round(mid.x - ann.x),
                        y: Math.round(mid.y - ann.y - 18),
                      });
                      onUpdateAnnotation?.(ann.id, { calloutElbows: nextElbows });
                    }
                  }}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                >
                  {language === 'zh' ? '+折角' : '+Corner'}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateAnnotation?.(ann.id, { calloutElbows: [] })}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  {language === 'zh' ? '直线' : 'Straight'}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateAnnotation?.(ann.id, { calloutElbows: undefined })}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  {language === 'zh' ? '重置' : 'Reset'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Paper Background Swatches */}
        <div className="flex items-center justify-between gap-1 bg-white/60 px-1.5 py-1 rounded">
          <span className="text-[9px] text-slate-500">
            {language === 'zh' ? '底色:' : 'Bg:'}
          </span>
          <div className="flex items-center gap-1">
            {STICKY_BG_PALETTE.map((bg) => (
              <button
                key={bg.value}
                type="button"
                onClick={() => onUpdateAnnotation?.(ann.id, { bgColor: bg.value })}
                className="w-3.5 h-3.5 rounded-xs border border-slate-300 cursor-pointer hover:scale-110"
                style={{ backgroundColor: bg.value }}
                title={bg.name}
              />
            ))}
          </div>
        </div>

        {/* 1:1 WYSIWYG In-place Textarea */}
        <textarea
          ref={textareaRef}
          value={ann.text || ''}
          onChange={(e) => onUpdateAnnotation?.(ann.id, { text: e.target.value })}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
              e.preventDefault();
              onFinishEditing();
            }
          }}
          rows={3}
          placeholder={language === 'zh' ? '直接输入便签内容（Enter 自由换行，Esc 完成）…' : 'Type note (Enter for newline, Esc to finish)...'}
          className="w-full bg-transparent border border-dashed border-slate-400/70 rounded-lg p-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-500">
            {language === 'zh' ? 'Enter 换行 · 点击空白或 Esc 保存' : 'Enter newline · Esc save'}
          </span>
          <button
            type="button"
            onClick={onFinishEditing}
            className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-semibold cursor-pointer hover:bg-slate-800"
          >
            {language === 'zh' ? '完成' : 'Done'}
          </button>
        </div>
      </div>
    );
  }
);

interface ShapeTextInlineEditorProps {
  ann: CanvasAnnotation;
  onUpdateAnnotation?: (id: string, updates: Partial<CanvasAnnotation>) => void;
  onFinishEditing: () => void;
}

export const ShapeTextInlineEditor: React.FC<ShapeTextInlineEditorProps> = React.memo(
  ({ ann, onUpdateAnnotation, onFinishEditing }) => {
    const { language } = useLanguage();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, []);

    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center relative"
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <textarea
          ref={textareaRef}
          value={ann.text || ''}
          onChange={(e) => {
            const nextVal = e.target.value;
            // For standalone text boxes, auto-expand height if multi-line text grows taller
            if (ann.kind === 'text' && textareaRef.current) {
              const scrollH = textareaRef.current.scrollHeight;
              if (scrollH + 14 > ann.height) {
                onUpdateAnnotation?.(ann.id, {
                  text: nextVal,
                  height: Math.max(ann.height, scrollH + 16),
                });
                return;
              }
            }
            onUpdateAnnotation?.(ann.id, { text: nextVal });
          }}
          onBlur={() => onFinishEditing()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
              e.preventDefault();
              onFinishEditing();
            }
            // Both Enter and Shift+Enter insert newlines naturally in-place!
          }}
          placeholder={
            language === 'zh'
              ? '原地输入文字（Enter 换行）…'
              : 'Type in-place (Enter for newline)...'
          }
          style={{
            color: ann.color,
            fontSize: `${ann.fontSize || 14}px`,
          }}
          className={`w-full h-full bg-transparent rounded-sm p-0 font-semibold leading-snug focus:outline-none resize-none whitespace-pre-wrap break-words overflow-hidden ${
            ann.kind === 'text' ? 'text-left' : 'text-center'
          }`}
        />
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[9px] px-2 py-0.5 rounded whitespace-nowrap pointer-events-none shadow-sm z-30">
          {language === 'zh'
            ? 'Enter / Shift+Enter 换行 · Esc 或点击空白完成'
            : 'Enter Newline · Esc or click outside to save'}
        </div>
      </div>
    );
  }
);
