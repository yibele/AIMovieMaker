
export interface PromptItem {
  id: string;          // UUID
  title: string;       // 标题
  content: string;     // 提示词内容
  coverImage?: string; // 封面图 URL (可选)
  category?: string;   // 分类 (仅系统提示词有)
  createdAt: string;   // ISO 时间字符串
}

export interface UpsertUserPromptRequest {
  title: string;
  content: string;
  coverImage?: string;
}

