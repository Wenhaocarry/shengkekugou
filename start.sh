#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
mkdir -p bin .runtime/cache .runtime/gopath
if command -v go >/dev/null 2>&1; then
  SHENGKE_GO="$(command -v go)"
elif [ -x .runtime/go/bin/go ]; then
  SHENGKE_GO="$PWD/.runtime/go/bin/go"
else
  if [ -x bin/shengke ]; then
    printf '未找到 Go，使用已有可执行程序。修改源码后需要 Go 1.22+ 重新编译。\n'
    exec ./bin/shengke "$@"
  fi
  printf '需要 Go 1.22 或更高版本。请安装 Go 后重试。\n' >&2
  exit 1
fi
export GOCACHE="$PWD/.runtime/cache"
export GOPATH="$PWD/.runtime/gopath"
printf '正在编译声刻（前端页面会一同嵌入 Go 程序）…\n'
"$SHENGKE_GO" build -o bin/shengke .
exec ./bin/shengke "$@"
