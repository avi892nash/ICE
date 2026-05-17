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

If the connection sits in `checking` and never goes to `connected`, your network is one of the cases the [Limitations](http://localhost:3000/limitations) page describes. Most often: symmetric NAT with no TURN server configured.

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
