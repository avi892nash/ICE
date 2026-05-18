#!/bin/sh
# Runs before the .deb is removed. Stops the service.
set -e

if [ -d /run/systemd/system ]; then
    systemctl stop ice-demo-update.timer || true
    systemctl stop ice-demo.service || true
    systemctl disable ice-demo-update.timer || true
    systemctl disable ice-demo.service || true
fi

exit 0
