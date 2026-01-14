#!/bin/bash
# PostToolUse hook: 파일 수정 후 자동 포매팅
# Claude Code가 파일을 수정하면 이 스크립트가 자동으로 실행됩니다.

# stdin에서 JSON 읽기
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

# 파일 경로가 없으면 종료
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

PROJECT_ROOT="/Users/mindong-il/ringle-tutor"

# Rails 파일 (.rb)
if [[ "$FILE_PATH" == *.rb ]]; then
  if [ -d "$PROJECT_ROOT/backend" ]; then
    cd "$PROJECT_ROOT/backend"
    bundle exec rubocop -A "$FILE_PATH" 2>/dev/null || true
  fi
fi

# React/TypeScript 파일 (.ts, .tsx, .js, .jsx)
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then
  if [ -d "$PROJECT_ROOT/frontend" ]; then
    cd "$PROJECT_ROOT/frontend"
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    npx eslint --fix "$FILE_PATH" 2>/dev/null || true
  fi
fi

exit 0
