import { supabase } from '@/lib/supabaseClient';
import { MaterialItem, MaterialType } from './types-materials';

// 类型定义与数据库表匹配
export interface DbMaterial {
  id: string;
  user_id: string;
  project_id?: string;
  type: MaterialType;
  url: string;
  thumbnail_url?: string;
  prompt?: string;
  meta: any;
  is_favorite: boolean;
  created_at: string;
}

// 添加素材到云端数据库
export async function addMaterialToCloud(
  material: Omit<MaterialItem, 'id' | 'createdAt' | 'tags'>,
  userId: string
): Promise<MaterialItem | null> {


  const dbMaterial = {
    user_id: userId,
    project_id: material.projectId,
    type: material.type,
    url: material.src,
    thumbnail_url: material.thumbnail || material.src,
    prompt: material.metadata?.prompt,
    meta: {
      mediaId: material.mediaId,
      mediaGenerationId: material.mediaGenerationId,
      ...material.metadata,
    },
  };

  const { data, error } = await supabase
    .from('materials')
    .insert(dbMaterial)
    .select()
    .single();

  if (error) {
    console.error('Error adding material to cloud:', error);
    throw error;
  }

  return mapDbToMaterialItem(data);
}

// 获取用户云端素材
export async function getCloudMaterials(userId: string, projectId?: string): Promise<MaterialItem[]> {


  let query = supabase
    .from('materials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching cloud materials:', error);
    throw error;
  }

  return (data || []).map(mapDbToMaterialItem);
}

// 删除云端素材
export async function deleteCloudMaterial(id: string): Promise<void> {


  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cloud material:', error);
    throw error;
  }
}

// 辅助函数：数据库类型转应用类型
function mapDbToMaterialItem(dbItem: DbMaterial): MaterialItem {
  return {
    id: dbItem.id,
    type: dbItem.type,
    name: dbItem.prompt ? dbItem.prompt.slice(0, 20) : 'Untitled', // 简略名
    src: dbItem.url,
    thumbnail: dbItem.thumbnail_url,
    mediaId: dbItem.meta?.mediaId,
    mediaGenerationId: dbItem.meta?.mediaGenerationId,
    metadata: dbItem.meta,
    createdAt: dbItem.created_at,
    projectId: dbItem.project_id,
    tags: ['cloud'], // 标记为云端素材
  };
}
