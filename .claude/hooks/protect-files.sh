#!/bin/bash
# PreToolUse hook: block edits to sensitive files
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# Block .env files
echo "$FILE_PATH" | grep -qE '\.env($|\.)' && echo "BLOCKED: .env files should not be edited directly — use Doppler for secrets management" >&2 && exit 2

# Block package lock files
[[ "$FILE_PATH" == *"package-lock.json" ]] && echo "BLOCKED: package-lock.json is auto-generated — use npm install" >&2 && exit 2

# Block migration files (create new ones instead)
[[ "$FILE_PATH" == *"supabase/migrations/"*.sql ]] && echo "BLOCKED: migrations are immutable — create new ones instead of editing existing" >&2 && exit 2

exit 0
