#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Limpia releases + tags que NO siguen el esquema canónico vX.Y.Z.
#
# Borra los duplicados de 2 segmentos (v1.10 … v1.20) y los tags basura
# (vOK12, vNavidad, vM3, vWINDOWS1). CONSERVA todas las releases vX.Y.Z y
# las releases protegidas que usa el runtime (deps-latest, latest-exe).
#
# Uso (requiere gh CLI autenticado: `gh auth login`):
#   bash scripts/cleanup-duplicate-releases.sh            # DRY-RUN (solo lista)
#   bash scripts/cleanup-duplicate-releases.sh --apply    # ejecuta el borrado
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
PROTECT_REGEX='^(deps-latest|latest-exe)$'   # NUNCA borrar estos (bootstrap/runtime)

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

command -v gh >/dev/null 2>&1 || { echo "❌ Se requiere gh CLI. Instala y ejecuta 'gh auth login'."; exit 1; }

echo "→ Consultando releases de ${REPO} ..."
mapfile -t TAGS < <(gh release list --repo "$REPO" --limit 300 --json tagName -q '.[].tagName')

KEEP=(); DROP=()
for t in "${TAGS[@]}"; do
  if [[ "$t" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || [[ "$t" =~ $PROTECT_REGEX ]]; then
    KEEP+=("$t")
  else
    DROP+=("$t")
  fi
done

echo ""
echo "✅ CONSERVAR (${#KEEP[@]}): ${KEEP[*]:-<ninguna>}"
echo "🗑  BORRAR    (${#DROP[@]}): ${DROP[*]:-<ninguna>}"
echo ""

if [ "${#DROP[@]}" -eq 0 ]; then
  echo "✓ No hay nada que limpiar."
  exit 0
fi

if [ "$APPLY" != "1" ]; then
  echo "DRY-RUN: no se borró nada. Re-ejecuta con --apply para aplicar."
  exit 0
fi

for t in "${DROP[@]}"; do
  echo "→ Borrando release + tag: $t"
  gh release delete "$t" --repo "$REPO" --yes --cleanup-tag || echo "  ⚠ No se pudo borrar $t (continuo)"
done

echo ""
echo "✅ Limpieza completada. Releases restantes:"
gh release list --repo "$REPO" --limit 300
