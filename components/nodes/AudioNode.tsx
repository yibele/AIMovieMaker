'use client';

import { memo, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, Pause, Volume2, Send, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import type { AudioElement, AudioVoice } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { toast } from 'sonner';

// 行级注释：音频节点默认尺寸
const AUDIO_NODE_DEFAULT_SIZE = { width: 280, height: 160 };

// 行级注释：预设的音色列表
const VOICE_OPTIONS: AudioVoice[] = [
  { id: 'hunyin_6', name: '浑音6号', description: '成熟男声' },
  { id: 'Arrogant_Miss', name: '傲娇小姐', description: '傲娇女声' },
];

// 行级注释：音频节点组件
function AudioNode({ data, selected, id }: NodeProps) {
  const audioData = data as unknown as AudioElement;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [textInput, setTextInput] = useState(audioData.text || '');
  const [selectedVoice, setSelectedVoice] = useState(audioData.voiceId || VOICE_OPTIONS[0].id);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const removeElement = useCanvasStore((state) => state.removeElement);
  const apiConfig = useCanvasStore((state) => state.apiConfig);

  // 行级注释：获取当前选中的音色信息
  const currentVoice = useMemo(() => {
    return VOICE_OPTIONS.find(v => v.id === selectedVoice) || VOICE_OPTIONS[0];
  }, [selectedVoice]);

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
    } as Partial<AudioElement>);

    try {
      // 行级注释：直接调用 MiniMax TTS API
      const payload = {
        model: 'speech-02-hd',  // 行级注释：使用稳定的模型版本
        text: text,
        stream: false,
        voice_setting: {
          voice_id: selectedVoice,
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
        output_format: 'url',  // 行级注释：返回 URL，有效期 24 小时
      };

      console.log('🎤 MiniMax TTS 请求:', { voiceId: selectedVoice, textLength: text.length });

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

      // 行级注释：提取音频数据
      const audioData = data.data;
      const extraInfo = data.extra_info || {};

      if (!audioData?.audio) {
        throw new Error('未返回音频数据');
      }

      console.log('✅ MiniMax TTS 成功:', {
        duration: extraInfo.audio_length,
        wordCount: extraInfo.word_count,
      });

      // 行级注释：更新节点数据
      updateElement(id, {
        status: 'ready',
        src: audioData.audio,  // output_format=url 时返回的是 URL
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
  }, [textInput, selectedVoice, apiConfig.minimaxApiKey, id, updateElement]);

  // 行级注释：删除节点
  const handleDelete = useCallback(() => {
    removeElement(id);
    toast.success('音频节点已删除');
  }, [id, removeElement]);

  // 行级注释：选择音色
  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    setIsVoiceMenuOpen(false);
  };

  return (
    <div
      className={`
        relative rounded-2xl overflow-visible
        transition-all duration-300 ease-out
        ${selected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-white' : ''}
      `}
      style={{
        width: audioData.size?.width || AUDIO_NODE_DEFAULT_SIZE.width,
        minHeight: audioData.size?.height || AUDIO_NODE_DEFAULT_SIZE.height,
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

      {/* 主容器 */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 shadow-lg overflow-hidden">
        
        {/* 头部 - 音色选择器 */}
        <div className="px-4 py-3 border-b border-violet-100 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-slate-700">语音合成</span>
            </div>
            
            {/* 音色选择器 */}
            <div className="relative">
              <button
                onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 rounded-lg text-xs font-medium text-violet-700 transition-colors"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {currentVoice.name}
                <ChevronDown className={`w-3 h-3 transition-transform ${isVoiceMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isVoiceMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => handleVoiceSelect(voice.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-violet-50 transition-colors ${
                        selectedVoice === voice.id ? 'bg-violet-100 text-violet-700' : 'text-slate-600'
                      }`}
                    >
                      <div className="font-medium">{voice.name}</div>
                      {voice.description && (
                        <div className="text-xs text-slate-400">{voice.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 内容区 */}
        {shouldShowInputPanel ? (
          // 输入面板
          <div className="p-4 space-y-3">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="输入要合成的文本..."
              className="w-full h-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !textInput.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  合成中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  合成语音
                </>
              )}
            </button>

            {audioData.status === 'error' && audioData.errorMessage && (
              <div className="text-xs text-red-500 text-center">
                {audioData.errorMessage}
              </div>
            )}
          </div>
        ) : (
          // 播放器面板
          <div className="p-4 space-y-3">
            {/* 文本预览 */}
            <div className="text-sm text-slate-600 line-clamp-2 bg-white/50 rounded-lg px-3 py-2">
              {audioData.text}
            </div>

            {/* 播放控制 */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-full text-white shadow-lg hover:shadow-xl transition-all"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              {/* 进度条 */}
              <div className="flex-1">
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                    style={{
                      width: `${audioData.duration ? (currentTime / audioData.duration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-slate-400">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(audioData.duration || 0)}</span>
                </div>
              </div>
            </div>

            {/* 隐藏的 audio 元素 */}
            <audio
              ref={audioRef}
              src={audioData.src}
              preload="metadata"
            />
          </div>
        )}

        {/* 底部工具栏 */}
        {selected && !shouldShowInputPanel && (
          <div className="px-4 py-2 border-t border-violet-100 bg-white/50 flex justify-end">
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
    </div>
  );
}

export default memo(AudioNode);

