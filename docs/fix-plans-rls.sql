-- ============================================
-- 修复 plans 表的 RLS 策略
-- 解决 CORS 错误问题
-- ============================================

-- 1. 启用 RLS (如果还没启用)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- 2. 删除旧的策略(如果存在)
DROP POLICY IF EXISTS "Allow public read access to plans" ON public.plans;

-- 3. 创建新的公开读取策略
CREATE POLICY "Allow public read access to plans"
ON public.plans
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. 验证策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'plans';

-- 5. 测试查询(应该成功)
SELECT * FROM public.plans ORDER BY sort_order ASC;
