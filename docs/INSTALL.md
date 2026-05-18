# Installing ice-demo

ice-demo ships as a `.deb` package via a small APT repo. Once installed, a
systemd timer auto-upgrades the package whenever a new release is published.

## Requirements

- Debian 11+ / Ubuntu 20.04+ (or anything `apt`-based)
- Node.js 18+ available as the system package (the .deb declares
  `Depends: nodejs (>= 18)`). The easiest source on Debian/Ubuntu is the
  [NodeSource setup script](https://github.com/nodesource/distributions).

## One-time setup

### 1. Trust the signing key

```bash
curl -fsSL https://avi892nash.github.io/ICE/apt/pubkey.gpg \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/ice-demo.gpg
```

### 2. Add the APT source

```bash
echo "deb [signed-by=/etc/apt/trusted.gpg.d/ice-demo.gpg] https://avi892nash.github.io/ICE/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/ice-demo.list
```

### 3. Install

```bash
sudo apt update
sudo apt install ice-demo
```

That's it. The service is up at <http://localhost:3000>.

## Auto-upgrade

Installation enables two systemd units:

| Unit | Purpose |
| --- | --- |
| `ice-demo.service` | Runs the Next.js server |
| `ice-demo-update.timer` | Daily check + apply of newer .deb versions |

Inspect the timer:

```bash
systemctl list-timers ice-demo-update.timer
```

Disable auto-upgrade (and only ever upgrade manually):

```bash
sudo systemctl disable --now ice-demo-update.timer
```

Force an immediate upgrade check:

```bash
sudo systemctl start ice-demo-update.service
```

## Configuration

Environment variables live in `/etc/ice-demo/ice-demo.env`. After editing,
restart the service:

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
sudo apt install --only-upgrade ice-demo   # manual upgrade
```

## Uninstall

```bash
sudo apt remove ice-demo             # keeps /etc/ice-demo and the user
sudo apt purge ice-demo              # remove everything including user
sudo rm /etc/apt/sources.list.d/ice-demo.list
sudo rm /etc/apt/trusted.gpg.d/ice-demo.gpg
```
