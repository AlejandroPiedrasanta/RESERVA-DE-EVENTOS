#!/usr/bin/env bash
# Regenerates node_modules tarball (pruned + zstd + gzip) and uploads to GitHub Releases.
# Run this LOCALLY (not in the pod) after changing frontend/package.json.
#
# Requirements:
#   - node + npm (for node-prune)
#   - tar, gzip
#   - zstd (recommended: brew install zstd  |  apt install zstd)
#   - gh CLI authenticated (gh auth login)
#
# Usage:
#   cd /path/to/RESERVA-DE-EVENTOS
#   bash regenerate-tarball.sh

set -euo pipefail

REPO="AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
RELEASE_TAG="deps-latest"

command -v tar >/dev/null || { echo "❌ tar no instalado"; exit 1; }
command -v gzip >/dev/null || { echo "❌ gzip no instalado"; exit 1; }

if [ ! -d frontend/node_modules ]; then
  echo "→ frontend/node_modules no existe, ejecutando yarn install..."
  (cd frontend && yarn install --frozen-lockfile)
fi

cd frontend

echo "→ Tamaño ANTES del prune:"
du -sh node_modules

echo ""
echo "→ Ejecutando node-prune (elimina tests, docs, .md, examples)..."
npx --yes node-prune node_modules

echo "→ Eliminando .d.ts, .map, .markdown, LICENSE duplicados..."
find node_modules \( \
    -name "*.d.ts" -o \
    -name "*.map" -o \
    -name "*.markdown" -o \
    -name "AUTHORS" -o \
    -name "CHANGELOG*" -o \
    -name "HISTORY*" -o \
    -name "*.flow" -o \
    -name "*.tsbuildinfo" \
  \) -type f -delete 2>/dev/null || true

find node_modules -type d \( \
    -name "test" -o \
    -name "tests" -o \
    -name "__tests__" -o \
    -name "docs" -o \
    -name "example" -o \
    -name "examples" -o \
    -name ".github" \
  \) -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "→ Tamaño DESPUÉS del prune:"
du -sh node_modules

echo ""
echo "→ Creando tarballs..."
cd ..

# Gzip (fallback universal, siempre)
tar -czf node_modules.tar.gz -C frontend node_modules
echo "  ✅ node_modules.tar.gz: $(du -sh node_modules.tar.gz | cut -f1)"

# Zstd (rápido, si está disponible)
if command -v zstd >/dev/null 2>&1; then
  tar --use-compress-program='zstd -19 -T0' -cf node_modules.tar.zst -C frontend node_modules
  echo "  ✅ node_modules.tar.zst: $(du -sh node_modules.tar.zst | cut -f1)"
else
  echo "  ⚠ zstd no instalado, saltando .tar.zst (instala con: brew install zstd)"
fi

echo ""
echo "→ Subiendo a release '${RELEASE_TAG}' de ${REPO}..."
if command -v gh >/dev/null 2>&1; then
  # Crea el release si no existe
  gh release view "${RELEASE_TAG}" --repo "${REPO}" >/dev/null 2>&1 || \
    gh release create "${RELEASE_TAG}" --repo "${REPO}" --title "Deps latest" --notes "Auto-generated tarballs"

  gh release upload "${RELEASE_TAG}" node_modules.tar.gz --clobber --repo "${REPO}"
  [ -f node_modules.tar.zst ] && gh release upload "${RELEASE_TAG}" node_modules.tar.zst --clobber --repo "${REPO}"
  echo "✅ Subidos al release"
else
  echo "⚠ gh CLI no instalado. Sube manualmente en:"
  echo "   https://github.com/${REPO}/releases/tag/${RELEASE_TAG}"
  echo ""
  echo "Archivos a subir:"
  ls -lh node_modules.tar.gz node_modules.tar.zst 2>/dev/null
fi

echo ""
echo "→ Limpiando archivos locales..."
rm -f node_modules.tar.gz node_modules.tar.zst
echo "✅ Listo."
