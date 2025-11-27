import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 创建 Supabase Admin Client (绕过 RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * GET: 获取用户的 DashScope API Key
 */
export async function GET(request: Request) {
  if (!supabaseAdmin) {
    console.error('Supabase Admin Client 初始化失败：缺少环境变量');
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

    // 2. 查询用户的 API Key
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('dashscope_api_key')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('查询用户 API Key 失败:', profileError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      dashScopeApiKey: profile?.dashscope_api_key || null,
    });

  } catch (error: any) {
    console.error('获取 API Key 失败:', error);
    return NextResponse.json(
      { error: error.message || '服务暂时不可用' },
      { status: 500 }
    );
  }
}

/**
 * POST: 保存用户的 DashScope API Key
 */
export async function POST(request: Request) {
  if (!supabaseAdmin) {
    console.error('Supabase Admin Client 初始化失败：缺少环境变量');
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
    const { dashScopeApiKey } = body;

    // 3. 验证 API Key 格式（可选，简单验证非空）
    if (!dashScopeApiKey || typeof dashScopeApiKey !== 'string') {
      return NextResponse.json({ error: '无效的 API Key' }, { status: 400 });
    }

    const trimmedKey = dashScopeApiKey.trim();
    if (trimmedKey.length < 10) {
      return NextResponse.json({ error: 'API Key 格式不正确' }, { status: 400 });
    }

    // 4. 保存到数据库
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        dashscope_api_key: trimmedKey,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('保存 API Key 失败:', updateError);
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    console.log('✅ 用户 API Key 已保存:', user.id.substring(0, 8) + '...');

    return NextResponse.json({
      success: true,
      message: 'API Key 已保存',
    });

  } catch (error: any) {
    console.error('保存 API Key 失败:', error);
    return NextResponse.json(
      { error: error.message || '服务暂时不可用' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 删除用户的 DashScope API Key
 */
export async function DELETE(request: Request) {
  if (!supabaseAdmin) {
    console.error('Supabase Admin Client 初始化失败：缺少环境变量');
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

    // 2. 删除 API Key
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        dashscope_api_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('删除 API Key 失败:', updateError);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    console.log('🗑️ 用户 API Key 已删除:', user.id.substring(0, 8) + '...');

    return NextResponse.json({
      success: true,
      message: 'API Key 已删除',
    });

  } catch (error: any) {
    console.error('删除 API Key 失败:', error);
    return NextResponse.json(
      { error: error.message || '服务暂时不可用' },
      { status: 500 }
    );
  }
}

