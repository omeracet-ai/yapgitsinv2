#!/usr/bin/env bash
# Phase 525 — UI literal "Usta" sweep guard.
#
# Memory rule (Phase 472): UI'da "usta" YASAK. Sadece "hizmet veren" / "hizmet
# alan" terimini kullan. Backend rozet/badge string'leri ve `/usta/...` GoRouter
# path'leri istisnadır (URL contract — değiştirilemez).
#
# Bu script CI step veya pre-commit hook olarak çalıştırılır.
# Çıkış kodu 0 → temiz. Çıkış kodu 1 → ihlal var.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/../lib"

if [[ ! -d "$LIB_DIR" ]]; then
  echo "lint_no_usta: lib/ bulunamadı: $LIB_DIR" >&2
  exit 2
fi

# Sadece string literal'ları ara ('Usta veya "Usta).
# Comment satırlarını (//, ///, /*) ve `/usta/` GoRouter path'lerini hariç tut.
violations=$(grep -rnE "['\"][^'\"]*[Uu]sta[^'\"]*['\"]" "$LIB_DIR" \
  | grep -vE "^\s*//" \
  | grep -vE "^[^:]+:[0-9]+:\s*//" \
  | grep -vE "^[^:]+:[0-9]+:\s*///" \
  | grep -vE "^[^:]+:[0-9]+:\s*\*" \
  | grep -vE "['\"]/usta[/-]" \
  | grep -vE "['\"]/profil/usta-ol['\"]" \
  || true)

if [[ -n "$violations" ]]; then
  echo "[lint_no_usta] UI literal 'Usta' ihlali (Phase 525):"
  echo "$violations"
  echo ""
  echo "Kural: UI'da 'usta/ustalar/ustaya' yerine 'hizmet veren' kullan."
  echo "Backend rozet/badge ve /usta/ route path'leri istisnadır."
  exit 1
fi

echo "[lint_no_usta] temiz — UI literal 'Usta' yok."
exit 0
