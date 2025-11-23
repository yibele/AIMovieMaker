import { useState, useCallback, useRef, RefObject } from 'react';
import {
  ConnectionMenuState,
  ImagePromptConfig,
} from '@/types/connection-menu';
import { CanvasElement } from '@/lib/types';

// 行级注释：创建初始的连线菜单状态
const createConnectionMenuState = (): ConnectionMenuState => ({
  visible: false,
  position: { x: 0, y: 0 },
  sourceNodeId: null,
  sourceNodeType: null,
  activeSubmenu: null,
  pendingImageConfig: null,
});

// 行级注释：连线菜单状态管理 Hook
export function useConnectionMenu() {
  const [connectionMenu, setConnectionMenu] = useState<ConnectionMenuState>(
    createConnectionMenuState
  );

  // 行级注释：提示词输入框引用
  const promptMenuInputRef = useRef<HTMLInputElement | null>(null);

  // 行级注释：重置菜单状态
  const resetConnectionMenu = useCallback(() => {
    setConnectionMenu(createConnectionMenuState());
  }, []);

  // 行级注释：显示连线菜单
  const showConnectionMenu = useCallback(
    (
      position: { x: number; y: number },
      sourceNodeId: string,
      sourceNodeType: CanvasElement['type']
    ) => {
      setConnectionMenu({
        visible: true,
        position,
        sourceNodeId,
        sourceNodeType,
        activeSubmenu: null,
        pendingImageConfig: null,
      });
    },
    []
  );

  // 行级注释：显示图片子菜单
  const showImageSubmenu = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'image',
      pendingImageConfig: null,
    }));
  }, []);

  // 行级注释：显示视频子菜单
  const showVideoSubmenu = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'video',
    }));
  }, []);

  // 行级注释：显示图生图提示词输入界面
  const showImagePromptInput = useCallback((aspectRatio: '9:16' | '16:9' | '1:1') => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'imagePrompt',
      pendingImageConfig: {
        aspectRatio,
        prompt: prev.pendingImageConfig?.prompt ?? '',
      },
    }));
  }, []);

  // 行级注释：更新图生图提示词输入值
  const updateImagePrompt = useCallback((prompt: string) => {
    setConnectionMenu((prev) => {
      if (!prev.pendingImageConfig) {
        return prev;
      }
      return {
        ...prev,
        pendingImageConfig: {
          ...prev.pendingImageConfig,
          prompt,
        },
      };
    });
  }, []);

  // 行级注释：返回到主菜单
  const backToMain = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: null,
      pendingImageConfig: null,
    }));
  }, []);

  // 行级注释：返回到图片子菜单
  const backToImageSubmenu = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'image',
    }));
  }, []);

  // 行级注释：准备连线菜单（连线开始时调用）
  const prepareConnectionMenu = useCallback(
    (sourceNodeId: string, sourceNodeType: CanvasElement['type']) => {
      setConnectionMenu({
        visible: false,
        position: { x: 0, y: 0 },
        sourceNodeId,
        sourceNodeType,
        activeSubmenu: null,
        pendingImageConfig: null,
      });
    },
    []
  );

  // 行级注释：显示镜头控制子菜单
  const showCameraControlSubmenu = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'cameraControl',
    }));
  }, []);

  // 行级注释：显示镜头位置子菜单
  const showCameraPositionSubmenu = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'cameraPosition',
    }));
  }, []);

  return {
    connectionMenu,
    promptMenuInputRef,
    resetConnectionMenu,
    showConnectionMenu,
    showImageSubmenu,
    showVideoSubmenu,
    showImagePromptInput,
    updateImagePrompt,
    backToMain,
    backToImageSubmenu,
    prepareConnectionMenu,
    showCameraControlSubmenu,
    showCameraPositionSubmenu,
  };
}

