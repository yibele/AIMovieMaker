#!/bin/bash

# 快速修复剩余API routes的resolveProxyAgent引用

files=(
  "app/api/flow/projects/delete/route.ts"
  "app/api/flow/projects/search/route.ts"
  "app/api/flow/workflows/search/route.ts"
)

for file in "${files[@]}"; do
  echo "快速修复 $file..."

  # 添加axios import如果不存在
  if ! grep -q "import axios from 'axios';" "$file"; then
    sed -i '' '1i\
import axios from '\''axios'\'';' "$file"
  fi

  # 更新import语句
  sed -i '' 's/import.*resolveProxyAgent.*lib\/proxy-agent.*//g' "$file"

  # 添加新的import
  if ! grep -q "handleApiError" "$file"; then
    sed -i '' '/import axios/a\
import {\
  handleApiError,\
  validateRequiredParams,\
  createProxiedAxiosConfig,\
} from '"'"'@/lib/api-route-helpers'"'"';' "$file"
  fi

  echo "完成 $file"
done

echo "所有文件已修复！请测试构建。"