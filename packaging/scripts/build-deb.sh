#!/bin/bash
# Build a .deb for ice-demo. Called by semantic-release with the next version.
#
#   bash packaging/scripts/build-deb.sh [VERSION]
#
# Requirements:
#   - nfpm (https://nfpm.goreleaser.com/install/)
#   - A completed `npm run build` (provides .next/standalone/)
#
set -euo pipefail

VERSION="${1:-${npm_package_version:-0.0.0-dev}}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

cd "$ROOT_DIR"

echo "==> Building .deb for ice-demo v$VERSION"

# Sanity check: standalone build must exist
if [ ! -d ".next/standalone" ]; then
    echo "ERROR: .next/standalone not found. Run 'npm run build' first."
    exit 1
fi
if [ ! -d ".next/static" ]; then
    echo "ERROR: .next/static not found. Run 'npm run build' first."
    exit 1
fi

# nfpm must be installed
if ! command -v nfpm >/dev/null 2>&1; then
    echo "ERROR: nfpm is not installed. See https://nfpm.goreleaser.com/install/"
    echo "  Quick install (Linux amd64):"
    echo "    curl -sLO https://github.com/goreleaser/nfpm/releases/latest/download/nfpm_amd64.deb"
    echo "    sudo dpkg -i nfpm_amd64.deb"
    exit 1
fi

# Ensure scripts are executable
chmod +x packaging/scripts/postinstall.sh
chmod +x packaging/scripts/preremove.sh
chmod +x packaging/scripts/postremove.sh

mkdir -p "$DIST_DIR"

# Render nfpm config with the version (env var substitution)
VERSION="$VERSION" \
    nfpm package \
        --config packaging/nfpm.yaml \
        --packager deb \
        --target "$DIST_DIR/"

# Generate checksums
(
    cd "$DIST_DIR"
    sha256sum *.deb > SHA256SUMS
)

echo "==> Built:"
ls -lh "$DIST_DIR"/*.deb
echo "==> SHA256SUMS:"
cat "$DIST_DIR/SHA256SUMS"
