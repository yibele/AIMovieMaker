#!/bin/bash

# 批量重构API routes脚本
# 将文件中的旧模式替换为新的共享工具函数

# 需要重构的文件列表
files=(
  "app/api/flow/projects/create/route.ts"
  "app/api/flow/projects/delete/route.ts"
  "app/api/flow/projects/search/route.ts"
  "app/api/flow/workflows/search/route.ts"
)

# 1. 更新import语句
for file in "${files[@]}"; do
  echo "重构 $file..."

  # 更新import
  sed -i '' 's/import.*resolveProxyAgent.*lib\/proxy-agent.*/\
import {\
  handleApiError,\
  validateRequiredParams,\
  createProxiedAxiosConfig,\
} from '"'"'@/lib/api-route-helpers'"'"';/' "$file"

  # 移除旧的import行
  sed -i '' '/import.*axios.*;$/d' "$file"

  # 添加axios import
  sed -i '' '/import.*{.*}.*@\/lib\/api-route-helpers.*/i\
import axios from '"'"'axios'"'"';' "$file"

  # 替换错误处理
  sed -i '' '/} catch (error: any) {/,/}/c\
  } catch (error: any) {\
    return handleApiError(error, '"'"'Flow API 代理'"'"');\
  }' "$file"

  echo "完成 $file"
done

echo "批量重构完成！请检查结果并测试构建。"