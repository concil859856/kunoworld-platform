#!/usr/bin/env bash
# Regenerates platform/deploy/workspace/uv.lock against the sibling checkouts:
#   <root>/platform (this repo) and <root>/subnet (kunoworld-subnet).
# Run after changing dependencies in platform/gateway, subnet/protocol or subnet/worker.
#   platform/deploy/workspace/relock.sh            # re-resolve, keeping existing pins where possible
#   platform/deploy/workspace/relock.sh --check    # fail if the lock is out of date (what CI runs)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
[[ -d "$ROOT/subnet/protocol" ]] || { echo "expected the subnet checkout at $ROOT/subnet" >&2; exit 2; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp "$HERE/pyproject.toml" "$WORK/"
[[ -f "$HERE/uv.lock" ]] && cp "$HERE/uv.lock" "$WORK/"
ln -s "$ROOT/subnet" "$WORK/subnet"
ln -s "$ROOT/platform" "$WORK/platform"

if [[ "${1:-}" == "--check" ]]; then
  (cd "$WORK" && uv lock --check)
else
  (cd "$WORK" && uv lock)
  cp "$WORK/uv.lock" "$HERE/uv.lock"
  echo "updated $HERE/uv.lock"
fi
