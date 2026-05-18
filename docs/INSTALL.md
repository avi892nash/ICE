# Installing ice-demo

ice-demo ships as a `.deb` attached to each [GitHub Release](https://github.com/avi892nash/ICE/releases). Once installed, a systemd timer polls the GitHub API and applies new versions automatically — no APT repo, no extra trust setup.

## Requirements

- Debian 11+ / Ubuntu 20.04+ (or anything `apt`-based)
- Node.js 18+ available as the system package. The .deb declares
  `Depends: nodejs (>= 18)`. The easiest source on Debian/Ubuntu is the
  [NodeSource setup script](https://github.com/nodesource/distributions).

## Install

### One-line download + install

```bash
LATEST=$(curl -fsSL https://api.github.com/repos/avi892nash/ICE/releases/latest \
  | grep -oE '"browser_download_url":\s*"[^"]*ice-demo_[^"]*_amd64\.deb"' \
  | head -1 \
  | grep -oE 'https://[^"]+')
curl -fsSL "$LATEST" -o /tmp/ice-demo.deb
sudo apt install -y /tmp/ice-demo.deb
```

`apt install ./file.deb` is preferred over `dpkg -i` because it auto-resolves the `nodejs` / `adduser` / `systemd` dependency lines.

The service is now up at <http://localhost:3000>.

## Auto-upgrade

The install enables two systemd units:

| Unit | Purpose |
| --- | --- |
| `ice-demo.service` | Runs the Next.js server (hardened, dedicated `ice-demo` user) |
| `ice-demo-update.timer` | Every 30 min: runs `/usr/bin/ice-demo-update`, which polls `https://api.github.com/repos/avi892nash/ICE/releases/latest`, compares `tag_name` against `/var/lib/ice-demo/installed-tag`, and `apt install`s the newer .deb if they differ |

Inspect the timer:

```bash
systemctl list-timers ice-demo-update.timer
```

Force an immediate update check:

```bash
sudo systemctl start ice-demo-update.service
journalctl -t ice-demo-update -f
```

Opt out of auto-upgrade (keep ice-demo on the version currently installed):

```bash
sudo systemctl disable --now ice-demo-update.timer
```

## Configuration

Environment variables live in `/etc/ice-demo/ice-demo.env`. After editing, restart the service:

```bash
sudo nano /etc/ice-demo/ice-demo.env
sudo systemctl restart ice-demo
```

Defaults:

```ini
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=production
```

## Operations

```bash
systemctl status ice-demo            # is it running?
journalctl -u ice-demo -f            # tail logs
systemctl restart ice-demo           # restart
sudo systemctl start ice-demo-update.service  # force an upgrade check now
journalctl -t ice-demo-update        # see updater history
```

## Uninstall

```bash
sudo apt remove ice-demo             # keeps /etc/ice-demo and the user
sudo apt purge ice-demo              # remove everything (including /var/lib/ice-demo)
```
