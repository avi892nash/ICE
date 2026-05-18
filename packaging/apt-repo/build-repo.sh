#!/bin/bash
# Build a flat APT repository in ./public/apt/ from .deb files in ./dist/.
# Designed to be hosted on GitHub Pages.
#
# Inputs (env):
#   GPG_KEY_ID        — fingerprint of the signing key (required for signed repo)
#   GPG_PRIVATE_KEY   — armored private key (optional, used in CI; falls back to gpg keyring)
#   APT_REPO_ORIGIN   — Origin: header (default: "ICE Demo APT")
#   APT_REPO_LABEL    — Label: header (default: "ice-demo")
#   APT_REPO_SUITE    — Suite: header (default: "stable")
#
# Produces:
#   public/apt/
#     Packages, Packages.gz
#     Release, Release.gpg, InRelease
#     pool/*.deb
#     pubkey.gpg          (armored public key, served to clients)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
REPO_DIR="$ROOT_DIR/public/apt"

ORIGIN="${APT_REPO_ORIGIN:-ICE Demo APT}"
LABEL="${APT_REPO_LABEL:-ice-demo}"
SUITE="${APT_REPO_SUITE:-stable}"
CODENAME="${APT_REPO_CODENAME:-stable}"
COMPONENT="${APT_REPO_COMPONENT:-main}"
ARCH="${APT_REPO_ARCH:-amd64}"

if [ ! -d "$DIST_DIR" ] || ! ls "$DIST_DIR"/*.deb >/dev/null 2>&1; then
    echo "ERROR: no .deb files found in $DIST_DIR — run build-deb.sh first."
    exit 1
fi

if ! command -v apt-ftparchive >/dev/null 2>&1; then
    echo "ERROR: apt-ftparchive missing. On Debian/Ubuntu: sudo apt install apt-utils"
    exit 1
fi

# Import private key if provided (CI case)
if [ -n "${GPG_PRIVATE_KEY:-}" ]; then
    echo "$GPG_PRIVATE_KEY" | gpg --batch --import
fi

mkdir -p "$REPO_DIR/pool"
cp -f "$DIST_DIR"/*.deb "$REPO_DIR/pool/"

cd "$REPO_DIR"

# Build Packages index
apt-ftparchive --arch "$ARCH" packages pool/ > Packages
gzip -9kf Packages

# Build Release file
cat > apt-ftparchive.conf <<EOF
APT::FTPArchive::Release::Origin   "$ORIGIN";
APT::FTPArchive::Release::Label    "$LABEL";
APT::FTPArchive::Release::Suite    "$SUITE";
APT::FTPArchive::Release::Codename "$CODENAME";
APT::FTPArchive::Release::Components "$COMPONENT";
APT::FTPArchive::Release::Architectures "$ARCH";
APT::FTPArchive::Release::Description "ice-demo APT repository";
EOF

apt-ftparchive -c apt-ftparchive.conf release . > Release
rm apt-ftparchive.conf

# Sign the Release file if a GPG key is available
if [ -n "${GPG_KEY_ID:-}" ]; then
    echo "==> Signing Release with key $GPG_KEY_ID"
    gpg --batch --yes --default-key "$GPG_KEY_ID" \
        --detach-sign --armor --output Release.gpg Release
    gpg --batch --yes --default-key "$GPG_KEY_ID" \
        --clearsign --output InRelease Release

    # Export the public key for clients to install
    gpg --armor --export "$GPG_KEY_ID" > pubkey.gpg
    echo "==> Wrote pubkey.gpg ($(wc -c < pubkey.gpg) bytes)"
else
    echo "WARN: GPG_KEY_ID not set; producing UNSIGNED repo. Clients will need [trusted=yes]."
fi

echo "==> APT repo built at $REPO_DIR"
ls -lh "$REPO_DIR"
