# Releasing ice-demo

This document is for maintainers. End users want [INSTALL.md](./INSTALL.md).

## Pipeline

```
Conventional commit on main
  │
  ▼
.github/workflows/release.yml
  ├── semantic-release
  │     ├── analyzes commits → next version
  │     ├── builds .deb via packaging/scripts/build-deb.sh
  │     ├── creates GitHub Release with .deb attached
  │     └── commits CHANGELOG.md + bumped package.json
  │
  └── publish-apt job
        ├── builds flat APT repo into public/apt/
        ├── signs with GPG (APT_GPG_PRIVATE_KEY)
        └── deploys public/ to GitHub Pages
```

End users have `https://avi892nash.github.io/ICE/apt` in
their sources.list. Their `ice-demo-update.timer` picks up the new version
within 24 hours of release.

## Conventional commits

The repo uses `@commitlint/config-conventional`. Allowed types:

| Type | Triggers release? | Notes |
| --- | --- | --- |
| `feat` | minor (X.Y+1.0) | New feature |
| `fix` | patch (X.Y.Z+1) | Bug fix |
| `perf` | patch | Performance |
| `refactor` | patch | Refactor with user-visible improvement |
| `build` | patch | Build/packaging change |
| `docs` | none | Documentation only |
| `style` | none | Whitespace/formatting |
| `test` | none | Tests only |
| `chore` | none | Misc maintenance |
| `ci` | none | CI/workflow change |
| `revert` | per body | Reverts a previous commit |

Breaking changes: append `!` after the type/scope or include
`BREAKING CHANGE: …` in the body → triggers a major release (X+1.0.0).

Examples:

```
feat(demo): add TURN credentials field
fix(simulator): correctly mark host pair failed on mDNS timeout
docs: explain why ICE leaks local IPs
feat(api)!: drop legacy /v1 routes
```

Husky's `commit-msg` hook validates every commit you make locally.

## One-time setup before the first release

### 1. Enable GitHub Pages

Settings → Pages → Source: **GitHub Actions** (not "Deploy from branch").

### 2. Generate a GPG signing key

```bash
gpg --batch --generate-key <<EOF
Key-Type: EDDSA
Key-Curve: ed25519
Subkey-Type: ECDH
Subkey-Curve: cv25519
Name-Real: ice-demo APT
Name-Email: noreply@avi892nash.github.io
Expire-Date: 5y
%no-protection
%commit
EOF
```

Get the key fingerprint:

```bash
gpg --list-secret-keys --keyid-format=long
# Look for the line:  sec   ed25519/ABCDEF0123456789 ...
```

Export the private key for CI:

```bash
gpg --armor --export-secret-keys ABCDEF0123456789 > apt-private.key
```

### 3. Add CI secrets

Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
| --- | --- |
| `APT_GPG_KEY_ID` | The fingerprint (`ABCDEF0123456789`) |
| `APT_GPG_PRIVATE_KEY` | Contents of `apt-private.key` |

`GITHUB_TOKEN` is provided automatically.

### 4. Publish the public key (one-time)

The APT repo build will write `pubkey.gpg` automatically. End users fetch it
from `https://avi892nash.github.io/ICE/apt/pubkey.gpg` as
described in INSTALL.md.

## Local dry run

Build the .deb without releasing:

```bash
npm ci
npm run build
npm run package:deb -- 1.2.3
ls dist/
```

Preview what semantic-release would do, without publishing:

```bash
npm run release:dry
```

Build a local APT repo (won't be signed unless GPG_KEY_ID is set):

```bash
GPG_KEY_ID=ABCDEF0123456789 bash packaging/apt-repo/build-repo.sh
# Output in public/apt/
```

Test the package end-to-end in a container:

```bash
docker run --rm -it -v "$PWD/dist:/dist" debian:12 bash
# Inside the container:
apt-get update && apt-get install -y nodejs
dpkg -i /dist/ice-demo_*.deb || apt-get install -fy
# Service won't actually run inside a container without systemd,
# but you can verify the install/config layout.
```

## When something breaks

| Symptom | Fix |
| --- | --- |
| commitlint rejects my message | Run `npx commitlint --edit .git/COMMIT_EDITMSG` to see the rule |
| semantic-release says "no relevant commits" | All commits since the last tag were `chore:`, `docs:`, etc. — push a `feat:` or `fix:` |
| `nfpm: command not found` in CI | Bump the installer URL in release.yml |
| APT clients say "NO_PUBKEY" | The signing key changed; re-export and push as `APT_GPG_PRIVATE_KEY` |
| Pages deploy fails with 403 | Re-check Pages source = "GitHub Actions" |
