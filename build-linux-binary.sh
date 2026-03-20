#!/bin/bash
# 此脚本在 WSL2 中运行

set -e

echo "正在进入项目目录..."
cd /mnt/d/code/opencode/opencode

echo "检查 Bun 是否已安装..."
if ! command -v bun &> /dev/null; then
    echo "Bun 未安装，正在安装..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "Bun 版本: $(bun --version)"

echo "开始构建 Linux 可执行包..."
bun run build:cimicode

echo ""
echo "==================================="
echo "构建完成！"
echo "可执行文件位置:"
ls -lh packages/opencode/dist/cimicode-linux-*/bin/cimicode 2>/dev/null || echo "请检查 dist 目录"
echo "==================================="
