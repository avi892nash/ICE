#!/bin/sh
# Runs after the .deb is removed. On 'purge' also removes the service user
# and config dir; otherwise leaves data alone (Debian convention).
set -e

case "$1" in
    purge)
        if id -u ice-demo >/dev/null 2>&1; then
            deluser --quiet ice-demo || true
        fi
        if getent group ice-demo >/dev/null 2>&1; then
            delgroup --quiet ice-demo || true
        fi
        rm -rf /etc/ice-demo
        rm -rf /opt/ice-demo
        ;;
    remove|upgrade|failed-upgrade|abort-install|abort-upgrade|disappear)
        # nothing to do
        ;;
    *)
        echo "postremove called with unknown argument '$1'" >&2
        exit 1
        ;;
esac

if [ -d /run/systemd/system ]; then
    systemctl daemon-reload || true
fi

exit 0
