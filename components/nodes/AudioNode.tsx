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

// 行级注释：音色分组类型
type VoiceGroup = {
  label: string;
  items: AudioVoice[];
};

// 行级注释：预设的音色分组列表
const VOICE_GROUPS: VoiceGroup[] = [
  {
    label: '男生',
    items: [
      { id: 'Chinese (Mandarin)_Reliable_Executive', name: '沉稳高管', description: '沉稳可靠/值得信赖' },
      { id: 'Chinese (Mandarin)_Unrestrained_Young_Man', name: '不羁青年', description: '潇洒不羁/个性' },
      { id: 'Chinese (Mandarin)_Radio_Host', name: '电台男主播', description: '富有诗意/引人入胜' },
      { id: 'Chinese (Mandarin)_Gentleman', name: '温润男声', description: '温润磁性/标准' },
      { id: 'Chinese (Mandarin)_Stubborn_Friend', name: '嘴硬竹马', description: '嘴硬心软/角色' },
    ]
  },
  {
    label: '女生',
    items: [
      { id: 'Arrogant_Miss', name: '嚣张小姐', description: '嚣张自信/优越感' },
      { id: 'Chinese (Mandarin)_News_Anchor', name: '新闻女声', description: '专业播音/标准' },
      { id: 'Chinese (Mandarin)_Sweet_Lady', name: '甜美女声', description: '温柔甜美/亲切' },
      { id: 'Chinese (Mandarin)_Gentle_Senior', name: '温柔学姐', description: '温暖温柔/知性' },
      { id: 'Chinese (Mandarin)_Mature_Woman', name: '傲娇御姐', description: '妩媚成熟/御姐' },
    ]
  },
  {
    label: '少年/特色',
    items: [
      { id: 'Chinese (Mandarin)_Pure-hearted_Boy', name: '清澈邻家弟弟', description: '认真清澈/少年' },
      { id: 'Chinese (Mandarin)_Cute_Spirit', name: '憨憨萌兽', description: '呆萌可爱/角色' },
      { id: 'Robot_Armor', name: '机械战甲', description: '电子音/科幻' },
      { id: 'Chinese (Mandarin)_Southern_Young_Man', name: '南方小哥', description: '质朴/南方口音' },
    ]
  },
  {
    label: '长辈',
    items: [
      { id: 'Chinese (Mandarin)_Humorous_Elder', name: '搞笑大爷', description: '爽朗幽默/北方口音' },
      { id: 'Chinese (Mandarin)_Kind-hearted_Elder', name: '花甲奶奶', description: '慈祥和蔼/温暖' },
    ]
  }
];

// 行级注释：扁平化的音色列表，用于查找
const ALL_VOICES = VOICE_GROUPS.flatMap(group => group.items);

// 行级注释：音频节点组件
function AudioNode({ data, selected, id }: NodeProps) {
  const audioData = data as unknown as AudioElement;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [textInput, setTextInput] = useState(audioData.text || '');
  const [selectedVoice, setSelectedVoice] = useState(audioData.voiceId || ALL_VOICES[0].id);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // 行级注释：下拉菜单位置状态（用于 Portal 渲染）
  const [voiceMenuPosition, setVoiceMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
  const apiConfig = useCanvasStore((state) => state.apiConfig);

  // 行级注释：获取当前选中的音色信息
  const currentVoice = useMemo(() => {
    return ALL_VOICES.find(v => v.id === selectedVoice) || ALL_VOICES[0];
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
      toast.error('请先在设置中配置 MiniMax API Key', {
        description: '点击右上角设置图标进行配置',
        duration: 5000,
      });
      return;
    }

    setIsGenerating(true);
    updateElement(id, {
      status: 'generating',
      text,
      voiceId: selectedVoice,
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
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
        output_format: 'hex',  // 行级注释：返回 hex 格式，可本地转 base64
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

      // 行级注释：提取音频数据（hex 格式）
      const audioResult = data.data;
      const extraInfo = data.extra_info || {};

      if (!audioResult?.audio) {
        throw new Error('未返回音频数据');
      }

      // 行级注释：将 hex 转换为 base64 (使用分块处理避免栈溢出)
      const hexString = audioResult.audio;
      const match = hexString.match(/.{1,2}/g);
      if (!match) throw new Error('无效的音频数据');

      const bytes = new Uint8Array(match.map((byte: string) => parseInt(byte, 16)));
      
      // 行级注释：分块转换，防止长音频导致 Maximum call stack size exceeded
      let binary = '';
      const len = bytes.byteLength;
      const CHUNK_SIZE = 8192; // 8KB 分块
      
      for (let i = 0; i < len; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64String = btoa(binary);
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
  }, [textInput, selectedVoice, apiConfig.minimaxApiKey, id, updateElement]);

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
    }
  }, [isVoiceMenuOpen]);

  // 行级注释：点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        voiceButtonRef.current && !voiceButtonRef.current.contains(target) &&
        !target.closest('[data-dropdown-menu]')
      ) {
        setIsVoiceMenuOpen(false);
        setVoiceMenuPosition(null);
      }
    };

    if (isVoiceMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVoiceMenuOpen]);

  return (
    <div
      className={`
        group relative rounded-xl overflow-hidden shadow-md border 
        bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700
        transition-all duration-200
        ${selected ? 'ring-2 ring-violet-500/50' : 'hover:border-gray-300 dark:hover:border-slate-600'}
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

      {/* 顶部工具栏 - 极简常驻 */}
      <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-black/20 backdrop-blur-sm rounded text-[10px] font-medium text-gray-600 dark:text-white/80 flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span>TTS</span>
          </div>
        </div>
        <div className="flex items-center gap-1 pointer-events-auto">
          {audioData.status === 'ready' && (
            <button
              onClick={handleDownload}
              className="p-1 hover:bg-gray-100 dark:hover:bg-black/20 rounded text-gray-500 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="下载音频"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-50 dark:hover:bg-red-500/20 rounded text-gray-500 dark:text-white/70 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="删除节点"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="relative w-full h-full flex flex-col bg-transparent">
        
        {shouldShowInputPanel ? (
          // 1. 生成前：文本输入 + 音色选择 + 情绪选择
          <div className="flex-1 flex flex-col p-3 pt-8">
            <div className="flex-1 relative mb-2">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="输入要合成的文本..."
                className="w-full h-full bg-transparent text-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 text-xs resize-none focus:outline-none custom-scrollbar"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* 底部控制栏 */}
            <div className="flex items-center gap-2 h-8">
              {/* 音色选择 */}
              <div className="relative flex-1 min-w-0">
                <button
                  ref={voiceButtonRef}
                  onClick={toggleVoiceMenu}
                  className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md text-[10px] text-gray-700 dark:text-white/90 transition-colors border border-gray-200 dark:border-white/5"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{currentVoice.name}</span>
                  <ChevronDown className={`w-3 h-3 ml-1 text-gray-400 dark:text-white/50 transition-transform ${isVoiceMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* 生成按钮 - 极简 Icon */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !textInput.trim()}
                className="w-8 h-8 flex-shrink-0 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center"
                onMouseDown={(e) => e.stopPropagation()}
                title="合成语音"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          // 2. 生成后：播放器视图 - 极简无动效
          <div className="flex-1 flex flex-col relative p-3 pt-8">
            
            {/* 文本预览 */}
            <div className="flex-1 overflow-hidden relative">
              <p className="text-xs text-gray-700 dark:text-white/80 font-medium leading-relaxed h-full overflow-y-auto custom-scrollbar pr-1">
                {audioData.text}
              </p>
              {/* 底部渐变遮罩，提示可滚动 */}
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none" />
            </div>

            {/* 播放控制区 */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-violet-500 hover:bg-violet-600 rounded-full text-white transition-all shadow-lg shadow-violet-500/20"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                )}
              </button>

              {/* 进度条 */}
              <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="relative h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden w-full">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-violet-500 transition-all duration-100 rounded-full"
                    style={{ width: `${audioData.duration ? (currentTime / audioData.duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-gray-400 dark:text-white/40">
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
          className="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
          style={{
            top: voiceMenuPosition.top - 4,
            left: voiceMenuPosition.left,
            width: voiceMenuPosition.width * 1.5, // 加宽一点以显示完整信息
            minWidth: 160,
            transform: 'translateY(-100%)',
            zIndex: 9999,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {VOICE_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? 'border-t border-gray-100 dark:border-white/5' : ''}>
              <div className="px-3 py-1.5 text-[9px] font-semibold text-gray-400 dark:text-slate-500 bg-gray-50/80 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                {group.label}
              </div>
              {group.items.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handleVoiceSelect(voice.id)}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border-b border-gray-50 dark:border-white/5 last:border-0 ${
                    selectedVoice === voice.id ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' : 'text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-medium">{voice.name}</div>
                  {voice.description && (
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{voice.description}</div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(AudioNode);

