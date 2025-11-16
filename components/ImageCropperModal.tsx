'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';

export type AspectRatioOption = '16:9' | '9:16';

export type CroppedImageResult = {
  dataUrl: string;
  width: number;
  height: number;
  aspect: AspectRatioOption;
};

interface ImageCropperModalProps {
  open: boolean;
  imageSrc: string | null;
  initialAspect?: AspectRatioOption;
  onCancel: () => void;
  onConfirm: (result: CroppedImageResult) => void | Promise<void>;
}

const aspectRatioMap: Record<AspectRatioOption, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

export default function ImageCropperModal({
  open,
  imageSrc,
  initialAspect = '16:9',
  onCancel,
  onConfirm,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedAspect, setSelectedAspect] =
    useState<AspectRatioOption>(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const aspectValue = useMemo(
    () => aspectRatioMap[selectedAspect],
    [selectedAspect]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSelectedAspect(initialAspect);
    setCroppedAreaPixels(null);
  }, [open, initialAspect]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels || isProcessing) {
      return;
    }
    try {
      setIsProcessing(true);
      const cropped = await getCroppedImage(imageSrc, croppedAreaPixels);
      await onConfirm({
        ...cropped,
        aspect: selectedAspect,
      });
    } catch (error) {
      console.error('裁剪图片失败:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, isProcessing, onConfirm, selectedAspect]);

  if (!open || !imageSrc) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4">
      <div className="flex flex-col bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-[88vh] overflow-hidden border border-white/10">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">裁剪图片</p>
            <p className="text-sm text-white/70 mt-0.5">
              请选择 Flow 支持的 16:9 或 9:16 比例并调整取景区域
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-sm px-3 py-1.5 rounded-md border border-white/30 hover:bg-white/10 transition"
          >
            关闭
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 px-6 py-4">
          <div className="flex-1 relative rounded-xl overflow-hidden bg-black/70">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectValue}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="rect"
              showGrid={false}
              objectFit="contain"
            />
          </div>

          <div className="bg-black/40 rounded-xl border border-white/5 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70">缩放</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-48 accent-white"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['16:9', '9:16'] as AspectRatioOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedAspect(option)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition ${
                    selectedAspect === option
                      ? 'bg-white text-gray-900 border-white'
                      : 'border-white/40 text-white hover:bg-white/10'
                  }`}
                >
                  {option === '16:9' ? '横向 16:9' : '纵向 9:16'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="px-4 py-2 rounded-md border border-white/30 text-sm hover:bg-white/10 transition"
            >
              重置
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-sm text-white/70">
            建议使用竖屏 9:16 或横屏 16:9，以确保 Flow 上传后可直接生成视频
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-white/30 text-sm hover:bg-white/10 transition"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || !croppedAreaPixels}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                isProcessing || !croppedAreaPixels
                  ? 'bg-white/30 text-gray-700 cursor-not-allowed'
                  : 'bg-white text-gray-900 hover:bg-gray-100'
              }`}
            >
              {isProcessing ? '裁剪中...' : '裁剪并上传'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area
): Promise<{ dataUrl: string; width: number; height: number }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('无法创建 Canvas 上下文');
  }

  const width = Math.round(pixelCrop.width);
  const height = Math.round(pixelCrop.height);

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  const mimeType = inferMimeType(imageSrc);
  const quality = mimeType === 'image/png' ? 1 : 0.92;
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return { dataUrl, width, height };
}

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (error) => reject(error));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;
  });
}

function inferMimeType(src: string): string {
  if (src.startsWith('data:image/png')) {
    return 'image/png';
  }
  if (src.startsWith('data:image/webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

