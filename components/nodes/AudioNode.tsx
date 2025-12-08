'use client';

import { memo, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, Pause, Volume2, Send, Trash2, ChevronDown, Loader2, Download, Music } from 'lucide-react';
import type { AudioElement, AudioVoice } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

// 行级注释：音频节点默认尺寸
const AUDIO_NODE_DEFAULT_SIZE = { width: 280, height: 200 };

// 行级注释：预设的音色列表
const VOICE_OPTIONS: AudioVoice[] = [
  { id: 'hunyin_6', name: '浑音6号', description: '成熟男声' },
  { id: 'Arrogant_Miss', name: '傲娇小姐', description: '傲娇女声' },
];

// 行级注释：情绪选项
const EMOTION_OPTIONS: Array<{ id: string; name: string }> = [
  { id: 'happy', name: '高兴' },
  { id: 'sad', name: '悲伤' },
  { id: 'angry', name: '愤怒' },
  { id: 'fearful', name: '害怕' },
  { id: 'disgusted', name: '厌恶' },
  { id: 'surprised', name: '惊讶' },
  { id: 'calm', name: '中性' },
  { id: 'fluent', name: '生动' },
  { id: 'whisper', name: '低语' },
];

// 行级注释：音频节点组件
function AudioNode({ data, selected, id }: NodeProps) {
  const audioData = data as unknown as AudioElement;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [textInput, setTextInput] = useState(audioData.text || '');
  const [selectedVoice, setSelectedVoice] = useState(audioData.voiceId || VOICE_OPTIONS[0].id);
  const [selectedEmotion, setSelectedEmotion] = useState<string>(audioData.emotion || 'calm');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isEmotionMenuOpen, setIsEmotionMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // 行级注释：下拉菜单位置状态（用于 Portal 渲染）
  const [voiceMenuPosition, setVoiceMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [emotionMenuPosition, setEmotionMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
  const emotionButtonRef = useRef<HTMLButtonElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
  const apiConfig = useCanvasStore((state) => state.apiConfig);

  // 行级注释：获取当前选中的音色信息
  const currentVoice = useMemo(() => {
    return VOICE_OPTIONS.find(v => v.id === selectedVoice) || VOICE_OPTIONS[0];
  }, [selectedVoice]);

  // 行级注释：获取当前选中的情绪信息
  const currentEmotion = useMemo(() => {
    return EMOTION_OPTIONS.find(e => e.id === selectedEmotion) || EMOTION_OPTIONS[6]; // default calm
  }, [selectedEmotion]);

  // 行级注释：是否显示输入面板（未生成或出错时显示）
  const shouldShowInputPanel = audioData.status === 'pending' || audioData.status === 'error' || !audioData.src;

  // 行级注释：格式化时长（毫秒转为 mm:ss）
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 行级注释：播放/暂停切换
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioData.src) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('播放失败:', err);
        toast.error('播放失败');
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioData.src]);

  // 行级注释：音频播放进度更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime * 1000);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // 行级注释：生成语音（直接从客户端调用 MiniMax API，不走服务器）
  const handleGenerate = useCallback(async () => {
    const text = textInput.trim();
    if (!text) {
      toast.error('请输入要合成的文本');
      return;
    }

    // 行级注释：检查 API Key（保存在本地）
    const minimaxApiKey = apiConfig.minimaxApiKey;
    if (!minimaxApiKey?.trim()) {
      toast.error('请先在设置中配置 MiniMax API Key');
      return;
    }

    setIsGenerating(true);
    updateElement(id, {
      status: 'generating',
      text,
      voiceId: selectedVoice,
      emotion: selectedEmotion as any,
    } as Partial<AudioElement>);

    try {
      // 行级注释：直接调用 MiniMax TTS API，使用 hex 格式获取音频数据
      const payload = {
        model: 'speech-2.6-turbo',  // 行级注释：使用稳定的模型版本
        text: text,
        stream: false,
        voice_setting: {
          voice_id: selectedVoice,
          speed: 1,
          vol: 1,
          pitch: 0,
          emotion: selectedEmotion,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
        output_format: 'hex',  // 行级注释：返回 hex 格式，可本地转 base64
      };

      console.log('🎤 MiniMax TTS 请求:', { voiceId: selectedVoice, emotion: selectedEmotion, textLength: text.length });

      const response = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${minimaxApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // 行级注释：检查返回状态
      if (data.base_resp?.status_code !== 0) {
        const errorMsg = data.base_resp?.status_msg || '语音合成失败';
        console.error('❌ MiniMax TTS 错误:', data.base_resp);
        throw new Error(errorMsg);
      }

      // 行级注释：提取音频数据（hex 格式）
      const audioResult = data.data;
      const extraInfo = data.extra_info || {};

      if (!audioResult?.audio) {
        throw new Error('未返回音频数据');
      }

      // 行级注释：将 hex 转换为 base64
      const hexString = audioResult.audio;
      const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
      const base64String = btoa(String.fromCharCode(...bytes));
      const dataUrl = `data:audio/mp3;base64,${base64String}`;

      console.log('✅ MiniMax TTS 成功:', {
        duration: extraInfo.audio_length,
        wordCount: extraInfo.word_count,
        base64Length: base64String.length,
      });

      // 行级注释：更新节点数据，优先使用 base64
      updateElement(id, {
        status: 'ready',
        src: dataUrl,  // 使用 base64 data URL
        base64: base64String,  // 保存原始 base64（不含前缀）
        duration: extraInfo.audio_length || 0,  // 毫秒
        audioInfo: {
          sampleRate: extraInfo.audio_sample_rate,
          bitrate: extraInfo.bitrate,
          format: extraInfo.audio_format || 'mp3',
          wordCount: extraInfo.word_count,
          audioSize: extraInfo.audio_size,
        },
      } as Partial<AudioElement>);

      toast.success('语音合成完成');
    } catch (error: any) {
      console.error('语音合成失败:', error);
      updateElement(id, {
        status: 'error',
        errorMessage: error.message,
      } as Partial<AudioElement>);
      toast.error(error.message || '语音合成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [textInput, selectedVoice, selectedEmotion, apiConfig.minimaxApiKey, id, updateElement]);

  // 行级注释：下载音频
  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioData.src) return;

    const a = document.createElement('a');
    a.href = audioData.src;
    a.download = `audio-${id}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('音频下载中...');
  }, [audioData.src, id]);

  // 行级注释：删除节点
  const handleDelete = useCallback(() => {
    deleteElement(id);
    toast.success('音频节点已删除');
  }, [id, deleteElement]);

  // 行级注释：选择音色
  const handleVoiceSelect = useCallback((voiceId: string) => {
    setSelectedVoice(voiceId);
    setIsVoiceMenuOpen(false);
    setVoiceMenuPosition(null);
  }, []);

  // 行级注释：选择情绪
  const handleEmotionSelect = useCallback((emotionId: string) => {
    setSelectedEmotion(emotionId);
    setIsEmotionMenuOpen(false);
    setEmotionMenuPosition(null);
  }, []);

  // 行级注释：切换音色菜单（计算位置用于 Portal）
  const toggleVoiceMenu = useCallback(() => {
    if (isVoiceMenuOpen) {
      setIsVoiceMenuOpen(false);
      setVoiceMenuPosition(null);
    } else {
      if (voiceButtonRef.current) {
        const rect = voiceButtonRef.current.getBoundingClientRect();
        setVoiceMenuPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
        });
      }
      setIsVoiceMenuOpen(true);
      setIsEmotionMenuOpen(false);
      setEmotionMenuPosition(null);
    }
  }, [isVoiceMenuOpen]);

  // 行级注释：切换情绪菜单（计算位置用于 Portal）
  const toggleEmotionMenu = useCallback(() => {
    if (isEmotionMenuOpen) {
      setIsEmotionMenuOpen(false);
      setEmotionMenuPosition(null);
    } else {
      if (emotionButtonRef.current) {
        const rect = emotionButtonRef.current.getBoundingClientRect();
        setEmotionMenuPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
        });
      }
      setIsEmotionMenuOpen(true);
      setIsVoiceMenuOpen(false);
      setVoiceMenuPosition(null);
    }
  }, [isEmotionMenuOpen]);

  // 行级注释：点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 检查点击是否在音色/情绪按钮或下拉菜单之外
      const target = e.target as HTMLElement;
      if (
        voiceButtonRef.current && !voiceButtonRef.current.contains(target) &&
        emotionButtonRef.current && !emotionButtonRef.current.contains(target) &&
        !target.closest('[data-dropdown-menu]')
      ) {
        setIsVoiceMenuOpen(false);
        setIsEmotionMenuOpen(false);
        setVoiceMenuPosition(null);
        setEmotionMenuPosition(null);
      }
    };

    if (isVoiceMenuOpen || isEmotionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVoiceMenuOpen, isEmotionMenuOpen]);

  return (
    <div
      className={`
        group relative rounded-[20px] overflow-hidden bg-white shadow-xl
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${selected ? 'ring-4 ring-violet-500/30 scale-[1.02]' : 'hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1'}
      `}
      style={{
        width: audioData.size?.width || AUDIO_NODE_DEFAULT_SIZE.width,
        height: audioData.size?.height || AUDIO_NODE_DEFAULT_SIZE.height,
      }}
    >
      {/* 输入连接点（左侧） */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
        style={{ left: '-6px', top: '50%', zIndex: 30 }}
        isConnectable={true}
      />

      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-20 bg-gradient-to-b from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[10px] font-medium text-white flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span>TTS</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {audioData.status === 'ready' && (
            <button
              onClick={handleDownload}
              className="p-1.5 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-lg text-white transition-colors"
              title="下载音频"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 bg-black/40 backdrop-blur-md hover:bg-red-500/80 rounded-lg text-white transition-colors"
            title="删除节点"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
        
        {shouldShowInputPanel ? (
          // 1. 生成前：文本输入 + 音色选择 + 情绪选择
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 relative">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="输入要合成的文本..."
                className="w-full h-full bg-transparent text-white/90 placeholder:text-white/30 text-sm resize-none focus:outline-none custom-scrollbar"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* 音色 + 情绪选择器 */}
            <div className="mt-2 flex items-center gap-2">
              {/* 音色选择 */}
              <div className="relative flex-1">
                <button
                  ref={voiceButtonRef}
                  onClick={toggleVoiceMenu}
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] text-white/90 transition-colors border border-white/5"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{currentVoice.name}</span>
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isVoiceMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* 情绪选择 */}
              <div className="relative flex-1">
                <button
                  ref={emotionButtonRef}
                  onClick={toggleEmotionMenu}
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] text-white/90 transition-colors border border-white/5"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{currentEmotion.name}</span>
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isEmotionMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* 生成按钮 */}
            <div className="mt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !textInput.trim()}
                className="w-full px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 text-sm"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>合成语音</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // 2. 生成后：播放器视图
          <div className="flex-1 flex flex-col relative">
            {/* 音频可视化背景（模拟） */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="flex gap-1 items-end h-16">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 bg-violet-400 rounded-t-sm transition-all duration-300 ${
                      isPlaying ? 'animate-pulse' : ''
                    }`}
                    style={{
                      height: `${30 + Math.random() * 70}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 文本预览 */}
            <div className="relative z-10 p-4 pb-0">
              <p className="text-xs text-white/70 line-clamp-2 font-medium leading-relaxed">
                {audioData.text}
              </p>
            </div>

            {/* 播放控制 */}
            <div className="flex-1 flex items-center justify-center relative z-10">
              <button
                onClick={handlePlayPause}
                className="w-14 h-14 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all group/btn border border-white/10"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 ml-1 fill-current" />
                )}
              </button>
            </div>

            {/* 进度条 */}
            <div className="relative h-1 bg-white/10 w-full">
              <div
                className="absolute left-0 top-0 bottom-0 bg-violet-500 transition-all duration-100"
                style={{ width: `${audioData.duration ? (currentTime / audioData.duration) * 100 : 0}%` }}
              />
              {/* 时间提示 */}
              <div className="absolute bottom-2 left-3 text-[10px] font-mono text-white/50">
                {formatDuration(currentTime)} / {formatDuration(audioData.duration || 0)}
              </div>
            </div>

            {/* 隐藏的 audio 元素 */}
            <audio
              ref={audioRef}
              src={audioData.src}
              preload="metadata"
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        )}

        {/* 错误提示 */}
        {audioData.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-40 p-4 text-center">
            <div className="space-y-2">
              <div className="text-red-400 text-xs font-medium">生成失败</div>
              <div className="text-white/70 text-xs">{audioData.errorMessage}</div>
              <button
                onClick={() => updateElement(id, { status: 'pending' } as Partial<AudioElement>)}
                className="mt-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 输出连接点（右侧） */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
        style={{ right: '-6px', top: '50%', zIndex: 30 }}
        isConnectable={true}
      />

      {/* 行级注释：音色下拉菜单（Portal 渲染到 body，避免被父容器裁剪） */}
      {isVoiceMenuOpen && voiceMenuPosition && typeof document !== 'undefined' && createPortal(
        <div
          data-dropdown-menu="voice"
          className="fixed bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
          style={{
            top: voiceMenuPosition.top - 4,
            left: voiceMenuPosition.left,
            width: voiceMenuPosition.width,
            transform: 'translateY(-100%)',
            zIndex: 9999,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {VOICE_OPTIONS.map((voice) => (
            <button
              key={voice.id}
              onClick={() => handleVoiceSelect(voice.id)}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 ${
                selectedVoice === voice.id ? 'bg-violet-500/20 text-violet-300' : 'text-slate-300'
              }`}
            >
              <div className="font-medium">{voice.name}</div>
              {voice.description && (
                <div className="text-[10px] text-slate-500 mt-0.5">{voice.description}</div>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* 行级注释：情绪下拉菜单（Portal 渲染到 body，避免被父容器裁剪） */}
      {isEmotionMenuOpen && emotionMenuPosition && typeof document !== 'undefined' && createPortal(
        <div
          data-dropdown-menu="emotion"
          className="fixed bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
          style={{
            top: emotionMenuPosition.top - 4,
            left: emotionMenuPosition.left,
            width: emotionMenuPosition.width,
            transform: 'translateY(-100%)',
            zIndex: 9999,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {EMOTION_OPTIONS.map((emotion) => (
            <button
              key={emotion.id}
              onClick={() => handleEmotionSelect(emotion.id)}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 ${
                selectedEmotion === emotion.id ? 'bg-violet-500/20 text-violet-300' : 'text-slate-300'
              }`}
            >
              <div className="font-medium">{emotion.name}</div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(AudioNode);

