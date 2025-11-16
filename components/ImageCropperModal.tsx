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
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="flex flex-col bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-5xl h-[90vh] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-center">
          <p className="text-lg font-medium text-gray-900">裁剪图片</p>
        </div>

        <div className="flex-1 flex flex-col p-5">
          <div className="flex-1 relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
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

          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">缩放</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-32 accent-blue-500"
              />
            </div>

            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {(['16:9', '9:16'] as AspectRatioOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedAspect(option)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    selectedAspect === option
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              重置
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              isProcessing || !croppedAreaPixels
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {isProcessing ? '裁剪中...' : '确定'}
          </button>
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

