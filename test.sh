#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if command -v go >/dev/null 2>&1; then SHENGKE_GO="$(command -v go)"; elif [ -x .runtime/go/bin/go ]; then SHENGKE_GO="$PWD/.runtime/go/bin/go"; else printf '需要 Go 1.22 或更高版本。\n' >&2; exit 1; fi
export GOCACHE="$PWD/.runtime/cache"
export GOPATH="$PWD/.runtime/gopath"
"$SHENGKE_GO" vet ./...
"$SHENGKE_GO" test -race -count=1 -v ./...
