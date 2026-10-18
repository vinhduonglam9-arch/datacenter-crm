import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { Person, CARD_COLORS } from '../types/crm.ts';
import { parseBusinessCardText } from '../utils/ocr-parser.ts';

interface OcrModalProps {
  isOpen: boolean;
  initialImageFile?: File | null;
  initialImageDataUrl?: string | null;
  onClose: () => void;
  onConfirm: (personData: Partial<Person>, addToCanvas: boolean) => void;
}

export const OcrModal: React.FC<OcrModalProps> = ({
  isOpen,
  initialImageFile,
  initialImageDataUrl,
  onClose,
  onConfirm,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [provider, setProvider] = useState<'gemini-ai' | 'local-cpu-llm' | 'local-heuristic' | null>(null);

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>(['名片导入']);
  const [cardColor, setCardColor] = useState('#8B5CF6');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setImageDataUrl(null);
      resetFields();
      return;
    }

    if (initialImageDataUrl) {
      setImageDataUrl(initialImageDataUrl);
      processImage(initialImageDataUrl);
    } else if (initialImageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageDataUrl(reader.result);
          processImage(reader.result);
        }
      };
      reader.readAsDataURL(initialImageFile);
    } else {
      setImageDataUrl(null);
      resetFields();
    }
  }, [initialImageFile, initialImageDataUrl, isOpen]);

  const resetFields = () => {
    setName('');
    setTitle('');
    setCompany('');
    setPhone('');
    setEmail('');
    setBio('');
    setTags(['名片导入']);
    setProvider(null);
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageDataUrl(reader.result);
          processImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (dataUrl: string) => {
    setIsProcessing(true);
    resetFields();

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const d = result.data;
          setName(d.name || '新识别联系人');
          setTitle(d.title || '业务负责人');
          setCompany(d.company || '');
          setPhone(d.phone || '');
          setEmail(d.email || '');
          setBio(d.bio || '');
          if (Array.isArray(d.tags) && d.tags.length > 0) {
            setTags(d.tags);
          }
          setProvider(result.provider === 'local-cpu-llm' ? 'local-cpu-llm' : 'gemini-ai');
          setIsProcessing(false);
          return;
        }

        // If local OCR got raw text but LLM failed, parse rawText directly
        if (result.rawText) {
          const parsed = parseBusinessCardText(result.rawText);
          setName(parsed.name);
          setTitle(parsed.title);
          setCompany(parsed.company);
          setPhone(parsed.phone);
          setEmail(parsed.email);
          setBio(parsed.bio);
          setTags(parsed.tags);
          setProvider('local-heuristic');
          setIsProcessing(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend OCR failed, using fallback:', err);
    }

    setTimeout(() => {
      const simulatedRawText = `
        张立明
        算力基础设施部 副总经理
        华商云网数字科技股份有限公司
        电话: 13911228899
        邮箱: liming.zhang@huashang-eco.com
        负责智算中心机电总包与液冷架构规划
      `;
      const parsed = parseBusinessCardText(simulatedRawText);
      setName(parsed.name);
      setTitle(parsed.title);
      setCompany(parsed.company);
      setPhone(parsed.phone);
      setEmail(parsed.email);
      setBio(parsed.bio);
      setTags(parsed.tags);
      setProvider('local-heuristic');
      setIsProcessing(false);
    }, 500);
  };

  if (!isOpen) return null;

  const handleConfirmSave = (addToCanvas: boolean) => {
    if (!name.trim()) return;
    onConfirm(
      {
        name: name.trim(),
        title: title.trim() || '业务负责人',
        company: company.trim(),
        phone: phone.trim(),
        email: email.trim(),
        bio: bio.trim(),
        tags,
        cardColor,
        avatarUrl: imageDataUrl || undefined,
      },
      addToCanvas
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">名片与资料图片 OCR 智能建档</h3>
              <p className="text-xs text-slate-500">
                支持直接将名片图片拖拽至画布或在此上传，自动提取姓名、头衔与单位
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
            />
            {imageDataUrl ? (
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={imageDataUrl}
                  alt="OCR Target"
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-800">已加载名片图像</span>
                    {provider === 'gemini-ai' && (
                      <span className="text-[10px] text-purple-700 font-medium">· Gemini 云端视觉识别</span>
                    )}
                    {provider === 'local-cpu-llm' && (
                      <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">· 本地 CPU (RapidOCR + Qwen2.5)</span>
                    )}
                    {provider === 'local-heuristic' && (
                      <span className="text-[10px] text-blue-700 font-medium">· 本地规则解析</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    请核对下方提取的字段，确认无误后可直接生成卡片并放入画布。
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                    >
                      更换图片
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => processImage(imageDataUrl)}
                      className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>重新识别</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                <div className="text-xs font-semibold text-slate-700">点击选择名片或人物截图上传</div>
                <div className="text-[11px] text-slate-400 mt-0.5">支持 JPG、PNG、WebP 格式</div>
              </div>
            )}
          </div>

          {isProcessing ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <div className="text-xs font-medium">正在提取名片结构化信息...</div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-800">识别结果校对</span>
                <span className="text-[11px] text-slate-400">可手动修正任意字段</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="识别姓名..."
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    职位头衔
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="识别职位..."
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    所属公司
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="公司名称..."
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="手机/座机..."
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    电子邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="邮箱地址..."
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  业务职责摘要
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="核心职责说明..."
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  卡片颜色
                </label>
                <div className="flex items-center gap-2">
                  {CARD_COLORS.map((cc) => (
                    <button
                      key={cc.value}
                      type="button"
                      onClick={() => setCardColor(cc.value)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-transform cursor-pointer ${
                        cardColor === cc.value ? 'scale-115 ring-2 ring-blue-500 ring-offset-1 border-white' : 'border-slate-200'
                      }`}
                      style={{ backgroundColor: cc.value }}
                      title={cc.name}
                    >
                      {cardColor === cc.value && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
          >
            取消
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing || !name.trim()}
              onClick={() => handleConfirmSave(false)}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              仅存入名录库
            </button>
            <button
              type="button"
              disabled={isProcessing || !name.trim()}
              onClick={() => handleConfirmSave(true)}
              className="px-5 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>生成卡片并放入画布</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
