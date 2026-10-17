import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileImage,
  FileCode,
  FileText,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  Check,
  Layers,
  Image as ImageIcon,
  Eye,
  Activity,
  Frame,
} from 'lucide-react';
import { Person, Relationship, VisitRecord, GroupFrame, ProjectMap } from '../types/crm.ts';
import { BackgroundStyleConfig, LineStyleConfig, CardStyleConfig } from '../types/styles.ts';
import {
  downloadGraphPng,
  downloadGraphSvg,
  downloadGraphPdf,
  generateGraphSvgString,
} from '../utils/graph-export.ts';
import { downloadRelationshipsCsv } from '../utils/csv-export.ts';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  relationships: Relationship[];
  visits: VisitRecord[];
  groupFrames?: GroupFrame[];
  showGroupFrames?: boolean;
  onToggleGroupFrames?: (val: boolean) => void;
  showStrengthHeatmap?: boolean;
  onToggleStrengthHeatmap?: (val: boolean) => void;
  project?: ProjectMap;
  projectName?: string;
  bgConfig?: BackgroundStyleConfig;
  lineConfig?: LineStyleConfig;
  cardConfig?: CardStyleConfig;
  onExportJson: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  people,
  relationships,
  visits,
  groupFrames = [],
  showGroupFrames = true,
  onToggleGroupFrames,
  showStrengthHeatmap = true,
  onToggleStrengthHeatmap,
  project,
  projectName = project?.name || '华云智算 32MW 液冷智算中心二期',
  bgConfig,
  lineConfig,
  cardConfig,
  onExportJson,
}) => {
  const [pngScale, setPngScale] = useState<number>(2);
  const [previewWithBg, setPreviewWithBg] = useState<boolean>(true);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const onCanvasCount = people.filter((p) => p.onCanvas && !p.hidden).length;

  const liveSvgPreview = useMemo(() => {
    if (!isOpen) return '';
    return generateGraphSvgString({
      people,
      relationships,
      visits,
      groupFrames,
      showGroupFrames,
      showStrengthHeatmap,
      project,
      projectName,
      withBackground: previewWithBg,
      bgConfig,
      lineConfig,
      cardConfig,
    });
  }, [
    isOpen,
    people,
    relationships,
    visits,
    groupFrames,
    showGroupFrames,
    showStrengthHeatmap,
    project,
    projectName,
    previewWithBg,
    bgConfig,
    lineConfig,
    cardConfig,
  ]);

  if (!isOpen) return null;

  const triggerExport = async (key: string, fn: () => Promise<void> | void) => {
    setExportingType(key);
    try {
      await fn();
    } finally {
      setTimeout(() => setExportingType(null), 500);
    }
  };

  const commonOptions = {
    people,
    relationships,
    visits,
    groupFrames,
    showGroupFrames,
    showStrengthHeatmap,
    project,
    projectName,
    scale: pngScale,
    bgConfig,
    lineConfig,
    cardConfig,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                100% 样式还原高清导出中心
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                完整保留当前图层顺序、{bgConfig?.name || '极简点阵灰'} · {lineConfig?.name || '平滑曲线'} · {cardConfig?.name || '经典白卡'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100/70">
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>所见即所得 (WYSIWYG) 实时渲染预览</span>
                <span className="text-[11px] font-normal text-slate-400 font-mono tabular-nums">
                  {onCanvasCount} 位人物 · {relationships.length} 条连线
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPreviewWithBg(!previewWithBg)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                    previewWithBg
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {previewWithBg ? '包含画布底纹' : '透明无底纹'}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleStrengthHeatmap?.(!showStrengthHeatmap)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                    showStrengthHeatmap
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>关系热力: {showStrengthHeatmap ? '开启' : '关闭'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleGroupFrames?.(!showGroupFrames)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                    showGroupFrames
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Frame className="w-3 h-3" />
                  <span>阵营框: {showGroupFrames ? '显示' : '隐藏'}</span>
                </button>
              </div>
            </div>

            <div
              className="w-full h-64 flex items-center justify-center p-2.5 overflow-hidden"
              style={{
                backgroundImage: !previewWithBg
                  ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)'
                  : undefined,
                backgroundSize: !previewWithBg ? '16px 16px' : undefined,
                backgroundPosition: !previewWithBg ? '0 0, 0 8px, 8px -8px, -8px 0' : undefined,
              }}
            >
              <div
                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:rounded-lg [&>svg]:shadow-sm"
                dangerouslySetInnerHTML={{ __html: liveSvgPreview }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800">
                  1. 导出高清 PNG 位图 (支持最高 3x 超清印刷分辨率)
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                {[
                  { scale: 1, label: '1x 标清' },
                  { scale: 2, label: '2x 高清' },
                  { scale: 3, label: '3x 超清印刷' },
                ].map((opt) => (
                  <button
                    key={opt.scale}
                    type="button"
                    onClick={() => setPngScale(opt.scale)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      pngScale === opt.scale
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  triggerExport('png-bg', () =>
                    downloadGraphPng({ ...commonOptions, withBackground: true })
                  )
                }
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/30 text-left transition-all flex items-start gap-3 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {exportingType === 'png-bg' ? <Check className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">
                    带主题底纹 PNG ({bgConfig?.name || '极简点阵灰'})
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    包含顶部项目工程信息栏与全套网格底纹，适合直接发送战报
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerExport('png-trans', () =>
                    downloadGraphPng({ ...commonOptions, withBackground: false })
                  )
                }
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 text-left transition-all flex items-start gap-3 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {exportingType === 'png-trans' ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">透明背景 PNG (免抠图素材)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    去除底纹背景，适合无缝嵌入企业 PPT 汇报胶片与 Word 标书
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <FileCode className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-800">
                2. 导出无损矢量 SVG 图纸（支持导入 Figma / Visio / Illustrator 二次编辑）
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  triggerExport('svg-bg', () =>
                    downloadGraphSvg({ ...commonOptions, withBackground: true })
                  )
                }
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-purple-500 bg-white hover:bg-purple-50/30 text-left transition-all flex items-start gap-3 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  {exportingType === 'svg-bg' ? <Check className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">带底纹完整矢量 SVG</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    无限放大不失真，完整保留所有矢量路径、圆角与文字图层
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerExport('svg-trans', () =>
                    downloadGraphSvg({ ...commonOptions, withBackground: false })
                  )
                }
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-pink-500 bg-white hover:bg-pink-50/30 text-left transition-all flex items-start gap-3 shadow-2xs cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                  {exportingType === 'svg-trans' ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">透明背景纯节点矢量 SVG</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    仅包含阵营框、连线与卡片矢量图元，适合设计师排版
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <FileText className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-800">
                3. 导出投委会汇报 PDF 战报与结构化台账
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  triggerExport('pdf', () => downloadGraphPdf(commonOptions))
                }
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-rose-500 bg-white hover:bg-rose-50/30 text-left transition-all flex flex-col justify-between gap-2 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    {exportingType === 'pdf' ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-semibold text-rose-600">A4 横版汇报</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">投委会作战简报 PDF</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    含算力规模/PUE/预算 KPI 看板与完整拓扑大图
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerExport('csv', () => downloadRelationshipsCsv(relationships, people, visits))
                }
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 text-left transition-all flex flex-col justify-between gap-2 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {exportingType === 'csv' ? <Check className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">Excel 兼容</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">关系台账表格 CSV</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    UTF-8 BOM 编码，直接用 Excel 打开无乱码
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerExport('json', onExportJson)}
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/30 text-left transition-all flex flex-col justify-between gap-2 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    {exportingType === 'json' ? <Check className="w-4 h-4" /> : <FileJson className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600">全量快照</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">项目完整备份 (JSON)</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    包含人物、连线、分组框、图层顺序与拜访记录
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            导出图像与 PDF 均与画布图层顺序、显示隐藏状态 100% 同步
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
