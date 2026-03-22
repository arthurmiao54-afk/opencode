#!/bin/bash
docker run --rm -v "$(pwd)":/app -w /app oven/bun:latest-alpine sh -c "
  apk add --no-cache libgcc libstdc++ nodejs
  bun install
  cd packages/opencode
  bun run script/build.ts --single --brand cimicode
"
