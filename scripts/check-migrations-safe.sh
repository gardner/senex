#!/usr/bin/env bash
set -euo pipefail

if [[ "${ALLOW_DESTRUCTIVE_MIGRATIONS:-}" == "1" ]]; then
  echo "ALLOW_DESTRUCTIVE_MIGRATIONS=1 set; skipping destructive migration check."
  exit 0
fi

if [[ ! -d migrations ]]; then
  echo "No migrations directory found."
  exit 0
fi

if grep -RniE '\bDROP\b|\bTRUNCATE\b|DROP[[:space:]]+COLUMN|RENAME[[:space:]]+COLUMN|RENAME[[:space:]]+TABLE' migrations; then
  echo "Potentially destructive migration found."
  echo "Use an expand/contract migration or set ALLOW_DESTRUCTIVE_MIGRATIONS=1 only for a manually approved deploy."
  exit 1
fi

echo "No obviously destructive migrations found."
