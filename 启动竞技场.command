#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf '请先安装 Node.js 22.13 或以上版本，再运行此文件。\n'
  exit 1
fi
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major<22 || (major===22 && minor<13)) { console.error("需要 Node.js 22.13 或以上版本"); process.exit(1); }'
if [ ! -d node_modules ]; then npm ci; fi
exec npm run dev -- --open
