#!/usr/bin/env bash
# Regenerates the frontend node_modules tarball used by bootstrap.sh fast-path.
#
# Since the migration to Vite the tarball is COMMITTED IN THE REPO at
# frontend/node_modules.tar.gz (currently ~64MB gzip, under GitHub's 100MB limit),
# together with a hash file frontend/node_modules.tar.gz.sha16 that bootstrap.sh
# uses to detect a stale tarball and fall back to `yarn install`.
#
# Run this LOCALLY after changing frontend/package.json, then commit the two files.
#
# Optional: also upload to a GitHub Release (deps-latest) if `gh` is available.
#
# Usage:
#   cd /path/to/RESERVA-DE-EVENTOS
#   bash regenerate-tarball.sh

set -euo pipefail

REPO="AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
RELEASE_TAG="deps-latest"

command -v tar >/dev/null  || { echo "❌ tar no instalado"; exit 1; }
command -v gzip >/dev/null || { echo "❌ gzip no instalado"; exit 1; }

# 1) Ensure node_modules matches the current lockfile.
echo "→ yarn install (frozen lockfile)..."
(cd frontend && yarn install --frozen-lockfile)

cd frontend

echo "→ Tamaño ANTES del prune:"; du -sh node_modules

# 2) Prune docs/tests/types/maps that are never needed at runtime.
echo "→ Podando (node-prune + limpieza manual)..."
npx --yes node-prune node_modules 2>/dev/null || echo "  (node-prune no disponible, se omite)"
find node_modules \( \
    -name "*.d.ts" -o -name "*.map" -o -name "*.markdown" -o \
    -name "AUTHORS" -o -name "CHANGELOG*" -o -name "HISTORY*" -o \
    -name "*.flow" -o -name "*.tsbuildinfo" \
  \) -type f -delete 2>/dev/null || true
find node_modules -type d \( \
    -name "test" -o -name "tests" -o -name "__tests__" -o \
    -name "docs" -o -name "example" -o -name "examples" -o -name ".github" \
  \) -exec rm -rf {} + 2>/dev/null || true

# Sanity: the Vite build tool must survive the prune.
[ -x node_modules/.bin/vite ] || { echo "❌ node_modules/.bin/vite ausente tras el prune"; exit 1; }

echo "→ Tamaño DESPUÉS del prune:"; du -sh node_modules

# 3) Create the committed tarball + hash file (both are tracked in git).
echo "→ Creando frontend/node_modules.tar.gz ..."
tar -czf node_modules.tar.gz node_modules
sha256sum package.json | cut -c1-16 > node_modules.tar.gz.sha16
echo "  ✅ node_modules.tar.gz: $(du -sh node_modules.tar.gz | cut -f1)"
echo "  ✅ node_modules.tar.gz.sha16: $(cat node_modules.tar.gz.sha16)"

# Guard against exceeding GitHub's 100MB per-file limit for committed files.
SIZE_BYTES=$(stat -c%s node_modules.tar.gz 2>/dev/null || stat -f%z node_modules.tar.gz)
if [ "$SIZE_BYTES" -gt 104857600 ]; then
  echo "⚠ node_modules.tar.gz > 100MB. No se puede commitear en git; usa el release '${RELEASE_TAG}'."
fi

cd ..

echo ""
echo "→ Siguiente paso: commitea los dos archivos:"
echo "     git add frontend/node_modules.tar.gz frontend/node_modules.tar.gz.sha16"
echo "     git commit -m 'chore: regenerate frontend deps tarball'"

# 4) Optional: also publish to a GitHub Release (fallback for fresh clones).
if command -v gh >/dev/null 2>&1; then
  echo ""
  echo "→ (opcional) Subiendo a release '${RELEASE_TAG}'..."
  gh release view "${RELEASE_TAG}" --repo "${REPO}" >/dev/null 2>&1 || \
    gh release create "${RELEASE_TAG}" --repo "${REPO}" --title "Deps latest" --notes "Auto-generated tarball"
  gh release upload "${RELEASE_TAG}" frontend/node_modules.tar.gz --clobber --repo "${REPO}"
  echo "✅ Subido al release"
fi

echo "✅ Listo."
