'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Camera, Download } from 'lucide-react';
import { MaterialItem } from '@/lib/types-materials';

interface VideoFrameExtractorModalProps {
  material?: MaterialItem;
  isOpen: boolean;
  onClose: () => void;
  onFrameExtracted?: (imageBlob: Blob, frameTime: number) => void;
  videoUrl?: string;
  videoNodeId?: string;
}

export default function VideoFrameExtractorModal({
  material,
  isOpen,
  onClose,
  onFrameExtracted,
  videoUrl,
  videoNodeId
}: VideoFrameExtractorModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);

  // Get video URL from material or prop
  const currentVideoUrl = material?.src || videoUrl || '';

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const extractFrame = useCallback(async () => {
    if (!videoRef.current || !onFrameExtracted) return;

    setIsExtracting(true);
    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('无法获取 canvas context');

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('无法生成图片'));
          }
        }, 'image/png');
      });

      await onFrameExtracted(blob, currentTime);
    } catch (error) {
      console.error('提取帧失败:', error);
      alert('提取帧失败: ' + (error as Error).message);
    } finally {
      setIsExtracting(false);
    }
  }, [currentTime, onFrameExtracted]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            提取视频帧
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Video Container */}
        <div className="p-6">
          <div className="relative bg-black rounded-lg overflow-hidden mb-4">
            {currentVideoUrl ? (
              <video
                ref={videoRef}
                src={currentVideoUrl}
                className="w-full max-h-96 object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-400">
                无视频源
              </div>
            )}
          </div>

          {/* Controls */}
          {currentVideoUrl && (
            <div className="space-y-4">
              {/* Play/Pause Button */}
              <div className="flex justify-center">
                <button
                  onClick={handlePlayPause}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <X size={20} />
                      暂停
                    </>
                  ) : (
                    <>
                      <Camera size={20} />
                      播放
                    </>
                  )}
                </button>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Extract Button */}
              <div className="flex justify-center">
                <button
                  onClick={extractFrame}
                  disabled={isExtracting}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Camera size={20} />
                  {isExtracting ? '提取中...' : '提取当前帧'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { VideoFrameExtractorModal };