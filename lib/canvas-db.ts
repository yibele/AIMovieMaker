/**
 * 画布数据持久化服务
 * 使用 IndexedDB (Dexie.js) 存储画布元素数据
 * 支持自动保存和恢复画布状态
 */

import Dexie, { Table } from 'dexie';
import { CanvasElement } from './types';
import { Edge } from '@xyflow/react';

// 行级注释：画布快照数据结构
export interface CanvasSnapshot {
  id: string; // projectId 作为主键
  elements: CanvasElement[]; // 画布元素（包含 base64）
  edges: Edge[]; // 连线数据
  projectTitle: string; // 项目标题
  updatedAt: string; // 最后更新时间
  createdAt: string; // 创建时间
}

// 行级注释：Dexie 数据库类定义
class CanvasDatabase extends Dexie {
  // 行级注释：画布快照表
  canvasSnapshots!: Table<CanvasSnapshot, string>;

  constructor() {
    super('AIMovieMakerDB');
    
    // 行级注释：数据库 schema 版本 1
    this.version(1).stores({
      // 行级注释：id 作为主键，updatedAt 用于排序
      canvasSnapshots: 'id, updatedAt',
    });
  }
}

// 行级注释：单例数据库实例
const db = new CanvasDatabase();

/**
 * 保存画布快照到 IndexedDB
 * 
 * @param projectId 项目 ID（作为主键）
 * @param elements 画布元素数组
 * @param edges 连线数组
 * @param projectTitle 项目标题
 */
export async function saveCanvasSnapshot(
  projectId: string,
  elements: CanvasElement[],
  edges: Edge[],
  projectTitle: string
): Promise<void> {
  // 行级注释：projectId 为空则不保存
  if (!projectId) {
    console.warn('⚠️ 无法保存画布：projectId 为空');
    return;
  }

  try {
    const now = new Date().toISOString();
    
    // 行级注释：检查是否存在该项目的快照
    const existing = await db.canvasSnapshots.get(projectId);
    
    const snapshot: CanvasSnapshot = {
      id: projectId,
      elements,
      edges,
      projectTitle,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
    };

    // 行级注释：使用 put 进行 upsert 操作（存在则更新，不存在则插入）
    await db.canvasSnapshots.put(snapshot);
    
    console.log(`✅ 画布已保存: ${projectId}, ${elements.length} 个元素, ${edges.length} 条连线`);
  } catch (error) {
    console.error('❌ 保存画布失败:', error);
    throw error;
  }
}

/**
 * 从 IndexedDB 加载画布快照
 * 
 * @param projectId 项目 ID
 * @returns 画布快照数据，如果不存在则返回 null
 */
export async function loadCanvasSnapshot(
  projectId: string
): Promise<CanvasSnapshot | null> {
  // 行级注释：projectId 为空则返回 null
  if (!projectId) {
    console.warn('⚠️ 无法加载画布：projectId 为空');
    return null;
  }

  try {
    const snapshot = await db.canvasSnapshots.get(projectId);
    
    if (snapshot) {
      console.log(`✅ 画布已加载: ${projectId}, ${snapshot.elements.length} 个元素, ${snapshot.edges.length} 条连线`);
      return snapshot;
    }
    
    console.log(`ℹ️ 未找到画布快照: ${projectId}`);
    return null;
  } catch (error) {
    console.error('❌ 加载画布失败:', error);
    return null;
  }
}

/**
 * 删除画布快照
 * 
 * @param projectId 项目 ID
 */
export async function deleteCanvasSnapshot(projectId: string): Promise<void> {
  if (!projectId) return;

  try {
    await db.canvasSnapshots.delete(projectId);
    console.log(`🗑️ 画布快照已删除: ${projectId}`);
  } catch (error) {
    console.error('❌ 删除画布失败:', error);
    throw error;
  }
}

/**
 * 获取所有画布快照列表（用于项目管理）
 * 
 * @returns 所有画布快照的元数据（不含完整 elements）
 */
export async function listCanvasSnapshots(): Promise<Array<{
  id: string;
  projectTitle: string;
  elementCount: number;
  edgeCount: number;
  updatedAt: string;
  createdAt: string;
}>> {
  try {
    const snapshots = await db.canvasSnapshots.toArray();
    
    return snapshots.map(s => ({
      id: s.id,
      projectTitle: s.projectTitle,
      elementCount: s.elements.length,
      edgeCount: s.edges.length,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));
  } catch (error) {
    console.error('❌ 获取画布列表失败:', error);
    return [];
  }
}

/**
 * 清空所有画布数据（危险操作，仅用于调试）
 */
export async function clearAllCanvasData(): Promise<void> {
  try {
    await db.canvasSnapshots.clear();
    console.log('🗑️ 所有画布数据已清空');
  } catch (error) {
    console.error('❌ 清空画布数据失败:', error);
    throw error;
  }
}

/**
 * 获取数据库存储使用情况（仅供参考）
 */
export async function getStorageUsage(): Promise<{
  snapshotCount: number;
  estimatedSize: string;
}> {
  try {
    const snapshots = await db.canvasSnapshots.toArray();
    const snapshotCount = snapshots.length;
    
    // 行级注释：粗略估算存储大小（序列化后的字节数）
    const totalBytes = snapshots.reduce((acc, s) => {
      return acc + JSON.stringify(s).length;
    }, 0);
    
    let estimatedSize: string;
    if (totalBytes < 1024) {
      estimatedSize = `${totalBytes} B`;
    } else if (totalBytes < 1024 * 1024) {
      estimatedSize = `${(totalBytes / 1024).toFixed(2)} KB`;
    } else {
      estimatedSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    
    return { snapshotCount, estimatedSize };
  } catch (error) {
    console.error('❌ 获取存储使用情况失败:', error);
    return { snapshotCount: 0, estimatedSize: '0 B' };
  }
}

// 行级注释：导出数据库实例（用于高级操作）
export { db as canvasDb };

