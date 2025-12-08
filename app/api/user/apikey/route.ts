import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 创建 Supabase Admin Client (绕过 RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// 行级注释：API Key 配置字段映射（前端字段名 -> 数据库字段名）
// 行级注释：只保存用户自己配置的 API Key，不包含平台提供的 dashScopeApiKey 和 accountTier
const API_KEY_FIELDS = {
  hailuoApiKey: 'hailuo_api_key',
  sora2ApiKey: 'sora2_api_key',
  falApiKey: 'fal_api_key',
} as const;

// 行级注释：反向映射（数据库字段名 -> 前端字段名）
const DB_TO_FRONTEND = Object.fromEntries(
  Object.entries(API_KEY_FIELDS).map(([k, v]) => [v, k])
);

/**
 * GET: 获取用户的所有 API Key 配置
 */
export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: '服务端配置错误' }, { status: 500 });
  }

  try {
    // 1. 验证用户登录状态
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 查询用户的所有 API Key
    const dbFields = Object.values(API_KEY_FIELDS).join(', ');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(dbFields)
      .eq('id', user.id)
      .single();

    if (profileError) {
      // 行级注释：如果查询失败（可能是字段不存在），返回空配置
      console.error('查询 API Key 失败:', profileError);
      return NextResponse.json({
        success: true,
        apiKeys: {},
      });
    }

    // 3. 转换为前端字段名
    const apiKeys: Record<string, string | null> = {};
    for (const [dbField, value] of Object.entries(profile || {})) {
      const frontendField = DB_TO_FRONTEND[dbField];
      if (frontendField) {
        apiKeys[frontendField] = value as string | null;
      }
    }

    return NextResponse.json({
      success: true,
      apiKeys,
    });

  } catch (error: any) {
    console.error('GET /api/user/apikey 错误:', error);
    return NextResponse.json(
      { error: error.message || '服务暂时不可用' },
      { status: 500 }
    );
  }
}

/**
 * POST: 保存用户的 API Key 配置（支持批量保存）
 */
export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: '服务端配置错误' }, { status: 500 });
  }

  try {
    // 1. 验证用户登录状态
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 解析请求体
    const body = await request.json();

    // 3. 构建更新数据（只更新提供的字段）
    const updateData: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    let hasValidField = false;

    for (const [frontendField, dbField] of Object.entries(API_KEY_FIELDS)) {
      if (frontendField in body) {
        const value = body[frontendField];
        
        // 行级注释：允许空字符串（用于清除 API Key）
        if (typeof value === 'string') {
          const trimmedValue = value.trim();
          updateData[dbField] = trimmedValue || null; // 空字符串转为 null
          hasValidField = true;
        }
      }
    }

    if (!hasValidField) {
      return NextResponse.json({ error: '没有有效的配置项' }, { status: 400 });
    }

    // 4. 保存到数据库
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('保存 API Key 失败:', updateError);
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'API 配置已保存',
    });

  } catch (error: any) {
    console.error('POST /api/user/apikey 错误:', error);
    return NextResponse.json(
      { error: error.message || '服务暂时不可用' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 删除用户的所有 API Key 配置
 */
export async function DELETE(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: '服务端配置错误' }, { status: 500 });
  }

  try {
    // 1. 验证用户登录状态
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 2. 清空所有 API Key
    const updateData: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };
    for (const dbField of Object.values(API_KEY_FIELDS)) {
      updateData[dbField] = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('删除 API Key 失败:', updateError);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'API 配置已清除',
    });

  } catch (error: any) {
    console.error('DELETE /api/user/apikey 错误:', error);
    return NextResponse.json(
      { error: error.message || '服务暂时不可用' },
      { status: 500 }
    );
  }
}

