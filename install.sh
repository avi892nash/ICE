#!/bin/sh
# One-line installer for ice-demo. Usage (must be run as root):
#
#   curl -fsSL https://raw.githubusercontent.com/avi892nash/ICE/main/install.sh | sudo sh
#
# Downloads the latest release's .deb from GitHub Releases and installs it
# via `apt install` so dependencies (nodejs, adduser, systemd) are auto-resolved.

set -e

REPO="avi892nash/ICE"
ASSET="ice-demo_amd64.deb"
URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"
TMP="$(mktemp -t ice-demo.XXXXXX.deb)"

# shellcheck disable=SC2317
trap 'rm -f "$TMP"' EXIT INT HUP TERM

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: must be run as root. Re-run as: curl ... | sudo sh" >&2
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR: curl is required" >&2
    exit 1
fi
if ! command -v apt >/dev/null 2>&1; then
    echo "ERROR: this installer requires apt (Debian / Ubuntu)" >&2
    exit 1
fi

echo "==> Downloading $ASSET from $URL"
curl -fsSL "$URL" -o "$TMP"

echo "==> Installing"
DEBIAN_FRONTEND=noninteractive apt install -y "$TMP"

VERSION="$(dpkg-query -W -f='${Version}' ice-demo 2>/dev/null || echo unknown)"
echo
echo "✓ ice-demo $VERSION installed."
echo "  systemctl status ice-demo            — is it running?"
echo "  journalctl -u ice-demo -f            — tail logs"
echo "  systemctl list-timers ice-demo-update.timer  — next auto-update"
echo
echo "  Default URL: http://localhost:3000"
