# 使用官方 Node.js 20 Alpine 镜像
FROM node:20-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./
# 安装依赖
RUN npm ci --only=production

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY . .
# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
# 构建 Next.js 应用
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public

# 自动创建 .next 目录
RUN mkdir .next

# 设置权限
RUN chown -R nextjs:nodejs /app/.next

# 复制构建输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]