#!/bin/sh
# Runs after the .deb is unpacked. Creates the service user, fixes
# permissions, then enables + starts the systemd units.
set -e

USER_NAME=ice-demo
GROUP_NAME=ice-demo
HOME_DIR=/opt/ice-demo

# 1. Create system user/group if missing
if ! getent group "$GROUP_NAME" >/dev/null 2>&1; then
    addgroup --system "$GROUP_NAME"
fi
if ! id -u "$USER_NAME" >/dev/null 2>&1; then
    adduser --system \
        --ingroup "$GROUP_NAME" \
        --home "$HOME_DIR" \
        --no-create-home \
        --shell /usr/sbin/nologin \
        --gecos "ICE Demo service user" \
        "$USER_NAME"
fi

# 2. Ownership and permissions
chown -R "$USER_NAME":"$GROUP_NAME" "$HOME_DIR"
chmod 0750 "$HOME_DIR"

if [ -d /etc/ice-demo ]; then
    chown -R root:"$GROUP_NAME" /etc/ice-demo
    chmod 0750 /etc/ice-demo
    chmod 0640 /etc/ice-demo/ice-demo.env || true
fi

# 3. systemd: reload, enable + (re)start service, enable auto-upgrade timer
if [ -d /run/systemd/system ]; then
    systemctl daemon-reload
    systemctl enable ice-demo.service
    systemctl enable ice-demo-update.timer
    # On install or upgrade, restart the service to pick up new code
    systemctl restart ice-demo.service
    systemctl start ice-demo-update.timer
fi

cat <<EOF

ice-demo installed successfully.

  Service:        systemctl status ice-demo
  Logs:           journalctl -u ice-demo -f
  Auto-upgrade:   systemctl list-timers ice-demo-update.timer
  Configure:      /etc/ice-demo/ice-demo.env (then: systemctl restart ice-demo)

Default URL:      http://localhost:3000

EOF

exit 0
