# ICE Demo — Interactive Connectivity Establishment

A Next.js app that demonstrates how WebRTC's **ICE** protocol (RFC 8445) finds a network path between two peers, and lays out where and why it breaks.

## What's inside

| Page | Purpose |
| --- | --- |
| `/` | Overview of ICE — the 4-stage pipeline and the candidate types |
| `/demo` | Live two-peer demo with copy-paste signaling and a data-channel chat |
| `/candidates` | Single-peer candidate gatherer with parsed-field inspection |
| `/limitations` | The 7 reasons ICE fails in production, with the underlying cause for each |

## Running locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

### Trying the demo

1. Open `/demo` in **two tabs** (or two browsers / two devices).
2. In tab A, click **Create offer**. Wait a second for ICE gathering to finish, then copy the base64 blob.
3. In tab B, click **I have an offer**, paste the blob, click **Generate answer**, then copy the answer blob back to tab A.
4. In tab A, paste the answer and click **Apply answer**.
5. When the peer state reads `connected`, type into the chat — messages flow over the WebRTC data channel directly, peer-to-peer.

If the connection sits in `checking` and never goes to `connected`, see the troubleshooting section below.

### Cross-device on the same LAN (most common failure)

The dev server already binds to all interfaces — Next prints both `http://localhost:3000` and `http://<your-lan-ip>:3000` on startup. Open the LAN URL on the second device.

If the page loads on both devices but the peer connection never reaches `connected`, the failure mode is almost always one of these:

1. **mDNS host candidates can't resolve cross-device over HTTP.** Chrome emits `xxx.local` candidates instead of raw IPs (for privacy). Resolution depends on the OS, and is sometimes restricted on non-secure (HTTP) origins.
2. **No NAT hairpinning.** Both peers' STUN-reflexive candidates point at the same public IP (your home router). Some consumer routers refuse to bounce packets from inside back through their public IP.

**Fix:** Leave the **Use free TURN** toggle on (default). Traffic falls back to a public TURN relay, the selected candidate pair shows as `relay`, and the chat works. For production you'd run your own TURN server.

### macOS firewall

If the LAN URL doesn't load at all from the second device:

```bash
# Allow node through the firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp $(which node)
```

Or temporarily: System Settings → Network → Firewall → off.

## How it works

- **`lib/webrtc.ts`** — peer connection factory, candidate parser, signaling encode/decode. Uses public Google + Cloudflare STUN.
- **`components/ICEDemo.tsx`** — the two-peer state machine. Wires up `onicecandidate`, `oniceconnectionstatechange`, `ondatachannel`, etc.
- **`components/CandidateExplorer.tsx`** — gathers candidates against STUN and lays out the parsed fields (foundation, priority, type, related address).

## Limitations of this demo

- **Copy-paste signaling.** Real apps use a WebSocket server. This is for visibility.
- **No TURN.** STUN-only means symmetric NATs will fail to connect. Intentional — see `/limitations`.
- **Same-origin chat only.** The two peers don't share state through any backend; everything is in the SDP exchange.

## Tech

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Native browser WebRTC APIs (no shims)

## Design prompts

See [`DESIGN_PROMPTS.md`](./DESIGN_PROMPTS.md) for prompts you can feed to Claude Design to regenerate any page with a more polished look.
