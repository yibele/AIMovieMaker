import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 创建 Supabase Admin Client (绕过 RLS)
// 防御性编程：在构建时如果没有 key，不立即报错，而是给一个 null
// 这样可以防止 next build 阶段因为缺少服务端密钥而失败
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: '服务端配置错误' }, { status: 500 });
  }

  try {
    // 1. 解析请求体
    const body = await request.json();
    const { code } = body;

    // 2. 验证用户登录状态 (从 header 获取 token)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 3. 验证输入
    if (!code?.trim()) {
      return NextResponse.json({ error: '请输入邀请码' }, { status: 400 });
    }
    // 转换为大写以忽略大小写差异（激活码存储为大写）
    const normalizedCode = code.trim().toUpperCase();

    // 4. 查询邀请码 (分步查询以避免联表问题)
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitation_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: '无效的邀请码' }, { status: 400 });
    }

    // 5. 检查是否可用
    if (invitation.is_used) {
      // 如果是本人使用的，可以再次返回凭证（方便换设备）
      if (invitation.used_by !== user.id) {
        return NextResponse.json({ error: '该邀请码已被使用' }, { status: 400 });
      }
    }

    // 6. 获取关联的系统凭证
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('system_credentials')
      .select('credentials_json, is_active')
      .eq('id', invitation.credential_id)
      .single();

    if (credError || !credentials || !credentials.is_active) {
      return NextResponse.json({ error: '该邀请码关联的系统资源已失效' }, { status: 403 });
    }

    // 7. 标记为已使用 (如果是第一次使用)
    if (!invitation.is_used) {
      const { error: updateError } = await supabaseAdmin
        .from('invitation_codes')
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq('code', normalizedCode);

      if (updateError) {
        throw updateError;
      }

      // 更新用户 Profile 状态
      await supabaseAdmin
        .from('profiles')
        .update({
          activation_status: 'active',
          activated_code: normalizedCode
        })
        .eq('id', user.id);
    }

    // 8. 返回凭证
    return NextResponse.json({
      success: true,
      message: '激活成功',
      credentials: credentials.credentials_json,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '激活服务暂时不可用' },
      { status: 500 }
    );
  }
}

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

    // 2. 查询用户激活状态
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('activation_status, activated_code')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.activation_status !== 'active' || !profile.activated_code) {
      return NextResponse.json({ activated: false });
    }

    // 3. 查询关联的凭证 (分步查询)
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitation_codes')
      .select('credential_id')
      .eq('code', profile.activated_code)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ activated: false, error: '凭证关联失效' });
    }

    const { data: credentials, error: credError } = await supabaseAdmin
      .from('system_credentials')
      .select('credentials_json, is_active')
      .eq('id', invitation.credential_id)
      .single();

    if (credError || !credentials || !credentials.is_active) {
      return NextResponse.json({ activated: true, status: 'expired', error: '系统凭证已过期或暂停' });
    }

    // 4. 返回凭证
    return NextResponse.json({
      activated: true,
      status: 'active',
      credentials: credentials.credentials_json,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: '获取凭证服务暂时不可用' },
      { status: 500 }
    );
  }
}