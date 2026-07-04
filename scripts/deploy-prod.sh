#!/usr/bin/env bash
set -euo pipefail

database_name="${D1_PROD_DATABASE_NAME:-senex-db}"

echo "Listing production D1 migrations for ${database_name}..."
pnpm wrangler d1 migrations list "${database_name}" --remote

echo "Applying production D1 migrations for ${database_name}..."
pnpm wrangler d1 migrations apply "${database_name}" --remote

echo "Deploying production Worker..."
pnpm wrangler deploy
