'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Sparkles, Bot, User, Loader2, Copy, Check, Key, Eye, EyeOff, Cloud, CloudOff } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { supabase, getCachedSession } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export default function GrokAssistantPanel() {
  const isOpen = useCanvasStore((state) => state.isAssistantOpen);
  const setIsOpen = useCanvasStore((state) => state.setIsAssistantOpen);
  const dashScopeApiKey = useCanvasStore((state) => state.apiConfig.dashScopeApiKey);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  
  // API Key 配置状态
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isSavingToServer, setIsSavingToServer] = useState(false);
  const [isLoadedFromServer, setIsLoadedFromServer] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是由阿里云通义千问（Qwen）驱动的智能助手。我可以帮你润色提示词、构思分镜或解答任何问题。'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 从服务器加载 API Key
  const loadApiKeyFromServer = useCallback(async () => {
    try {
      // 行级注释：使用缓存的 session，减少 API 请求
      const session = await getCachedSession();
      if (!session?.access_token) {
        return;
      }

      const response = await fetch('/api/user/apikey', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('获取 API Key 失败:', response.status);
        return;
      }

      const data = await response.json();
      if (data.success && data.dashScopeApiKey) {
        // 只有当本地没有 API Key 或与服务器不同时才更新
        if (!dashScopeApiKey || dashScopeApiKey !== data.dashScopeApiKey) {
          setApiConfig({ dashScopeApiKey: data.dashScopeApiKey });
          setIsLoadedFromServer(true);
        }
      }
    } catch (error) {
      console.error('加载 API Key 失败:', error);
    }
  }, [dashScopeApiKey, setApiConfig]);

  // 保存 API Key 到服务器
  const saveApiKeyToServer = useCallback(async (apiKey: string) => {
    try {
      // 行级注释：使用缓存的 session，减少 API 请求
      const session = await getCachedSession();
      if (!session?.access_token) {
        return false;
      }

      setIsSavingToServer(true);
      const response = await fetch('/api/user/apikey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ dashScopeApiKey: apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存失败');
      }

      setIsLoadedFromServer(true);
      return true;
    } catch (error) {
      console.error('保存 API Key 到服务器失败:', error);
      toast.error('API Key 保存到云端失败，但已保存到本地');
      return false;
    } finally {
      setIsSavingToServer(false);
    }
  }, []);

  // 初始化时从服务器加载 API Key
  useEffect(() => {
    if (isOpen && !dashScopeApiKey) {
      loadApiKeyFromServer();
    }
  }, [isOpen, dashScopeApiKey, loadApiKeyFromServer]);

  // 清空会话
  const handleClearChat = () => {
    setMessages([{ 
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是由阿里云通义千问（Qwen）驱动的智能助手。我可以帮你润色提示词、构思分镜或解答任何问题。'
    }]);
    toast.success('Conversation cleared');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!dashScopeApiKey) {
      toast.error('Please configure your DashScope API Key in Settings first.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    // 构建消息历史用于发送 (过滤掉 welcome 消息和 loading 状态)
    const historyMessages = messages
      .filter(m => m.id !== 'welcome' && !m.isStreaming)
      .map(m => ({ role: m.role, content: m.content }));
    
    // 添加当前用户消息
    const apiMessages = [
      { role: 'system', content: 'You are a helpful creative assistant for AI video generation. You help users write prompts, storyboard ideas, and refine creative concepts.' },
      ...historyMessages,
      { role: 'user', content: userMessage.content }
    ];

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: botMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true
    }]);

    try {
      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dashScopeApiKey}`
        },
        body: JSON.stringify({
          model: 'qwen-plus', // 使用 qwen-plus
          messages: apiMessages,
          stream: true,
          stream_options: { include_usage: false }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
            
            if (trimmedLine.startsWith('data: ')) {
                try {
                    const data = JSON.parse(trimmedLine.slice(6));
                    const content = data.choices?.[0]?.delta?.content;
                    
                    if (content) {
                        botContent += content;
                        setMessages(prev => prev.map(msg => 
                            msg.id === botMessageId 
                            ? { ...msg, content: botContent } 
                            : msg
                        ));
                    }
                } catch (e) {
                    console.error('Error parsing SSE:', e);
                }
            }
        }
      }

      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, isStreaming: false } 
          : msg
      ));

    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, content: 'Sorry, I encountered an error connecting to Qwen API. Please check your API Key.', isStreaming: false } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div 
      className={`
        fixed right-[80px] top-4 bottom-4 w-[440px] max-w-[90vw] bg-white/90 backdrop-blur-2xl z-[50] 
        rounded-3xl border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden
        transform transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
        flex flex-col
        ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
      `}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 flex flex-col gap-4 bg-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <span className="font-mono font-bold text-lg">Q</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Qwen Assistant</h2>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online (DashScope)
                </p>
                {messages.length > 1 && (
                  <button 
                      onClick={handleClearChat}
                      className="text-[10px] text-slate-400 hover:text-red-500 underline decoration-slate-200 hover:decoration-red-200 transition-all"
                  >
                      Clear Chat
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.role === 'assistant' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}
            `}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            
            <div className={`
              group relative max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'assistant' 
                ? 'bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-none' 
                : 'bg-slate-900 text-white rounded-tr-none'}
            `}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-100 prose-code:text-pink-600">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-orange-500 animate-pulse" />
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}

              {/* Copy Button (Assistant Only) */}
              {msg.role === 'assistant' && !msg.isStreaming && (
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  className="absolute -right-8 top-2 p-1.5 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-t border-gray-100 dark:border-slate-700">
        {/* API Key 配置区域 */}
        {(!dashScopeApiKey || isConfiguring) && (
          <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                {dashScopeApiKey ? '修改 API Key' : '配置 DashScope API Key'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className="w-full pl-3 pr-20 py-2 bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={async () => {
                    if (apiKeyInput.trim()) {
                      const trimmedKey = apiKeyInput.trim();
                      // 先保存到本地
                      setApiConfig({ dashScopeApiKey: trimmedKey });
                      // 同步到服务器
                      const savedToServer = await saveApiKeyToServer(trimmedKey);
                      toast.success(savedToServer ? 'API Key 已保存到云端' : 'API Key 已保存到本地');
                      setApiKeyInput('');
                      setIsConfiguring(false);
                    }
                  }}
                  disabled={!apiKeyInput.trim() || isSavingToServer}
                  className="px-2 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors flex items-center gap-1"
                >
                  {isSavingToServer ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  保存
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-orange-600/70 dark:text-orange-400/70">
              从 <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-700 dark:hover:text-orange-300">阿里云控制台</a> 获取 API Key
            </p>
            {dashScopeApiKey && (
              <button
                onClick={() => setIsConfiguring(false)}
                className="mt-2 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                取消修改
              </button>
            )}
          </div>
        )}
        
        {/* 已配置 API Key 时的提示 */}
        {dashScopeApiKey && !isConfiguring && (
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              API Key 已配置
              {isLoadedFromServer && (
                <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400 ml-1">
                  <Cloud className="w-3 h-3" />
                  云端同步
                </span>
              )}
            </div>
            <button
              onClick={() => setIsConfiguring(true)}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              修改
            </button>
          </div>
        )}
        
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="让 AI 帮你润色提示词..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-700 border-transparent focus:bg-white dark:focus:bg-slate-600 border focus:border-slate-200 dark:focus:border-slate-500 rounded-xl outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none max-h-32 min-h-[50px] custom-scrollbar shadow-inner"
            rows={1}
            disabled={isLoading || !dashScopeApiKey}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading || !dashScopeApiKey}
            className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-all duration-200
              ${input.trim() && !isLoading && dashScopeApiKey
                ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:scale-105' 
                : 'bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium">
          Powered by Qwen-Plus (DashScope)
        </p>
      </div>
    </div>
  );
}
