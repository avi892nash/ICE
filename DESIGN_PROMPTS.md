# Design Prompts for Claude Design

Copy any block below into Claude Design (or any design tool) to regenerate a richer version of the corresponding page. Each prompt includes the page's purpose, the content blocks it must show, the data states to design for, and a visual direction.

---

## 1. Landing / Overview page (`/`)

> Design a landing page for a developer documentation site about **WebRTC's ICE (Interactive Connectivity Establishment) protocol**. The page should feel like a cross between Stripe Docs and Linear's marketing pages — clean, technical, confident.
>
> **Hero section**
> - Tag: `RFC 8445 · WebRTC`
> - Headline: "How ICE establishes a peer-to-peer connection"
> - Subhead: One sentence explaining that ICE finds a network path between peers behind NATs and firewalls.
> - Two CTAs: primary "Try the live demo →", secondary "Read the limitations".
> - Hero visual: an isometric or flat illustration of two laptops with arrows showing candidate pairs being tested between them. Include little chips/labels for the candidate types (host, srflx, prflx, relay) along the arrows.
>
> **Section: The four-stage ICE pipeline**
> - 2x2 grid of cards, each numbered 1–4: Gathering, Signaling, Connectivity checks, Nomination.
> - Each card has a 32px icon, a title, and 1–2 sentences of body copy.
> - Cards should feel scannable — generous padding, soft borders, no shadows.
>
> **Section: Candidate types**
> - A horizontally aligned legend showing 4 colored badges: `host` (emerald), `srflx` (blue), `prflx` (purple), `relay` (amber).
> - Each badge sits next to a one-sentence description.
> - Consider a small diagram showing where each candidate originates (LAN router for host, STUN server for srflx, TURN relay for relay).
>
> **Section: What's in this demo**
> - A subtle, slightly different background (light slate or off-white) card with 3 numbered links to /demo, /candidates, /limitations.
>
> **Style direction**
> - Color: cool blue accent (#0284c7 area) on a neutral slate background.
> - Typography: Inter or similar geometric sans-serif. Monospace (JetBrains Mono) for code/badges.
> - Spacing: generous. Hero should breathe — minimum 80px vertical padding.
> - No emojis. No gradients except the small logomark.

---

## 2. Live demo page (`/demo`)

> Design an **interactive WebRTC demo page** where a user establishes a real peer-to-peer connection between two browser tabs using copy-paste signaling. This is the working core of the app — every section is live.
>
> **Page header**
> - Title: "Live ICE demo"
> - Description: 2 sentences explaining the two-tab flow.
> - An amber callout box noting the demo uses STUN-only (no TURN) and copy-paste signaling.
>
> **State bar** (sticky-ish, just under the header)
> - 4 small status chips horizontally: Role, Gathering state, ICE state, Peer state.
> - Each chip shows label (uppercase, small) and current value (mono font).
> - Chips change color by state: green for `connected`, amber for `checking`, red for `failed/closed`, neutral otherwise.
>
> **Main two-column layout** (stacks on mobile)
> - LEFT column:
>   - Signaling panel: two textareas (local SDP output, remote SDP input) with a Copy button on the output and an Apply/Generate button under the input. Both textareas show base64-encoded blobs in a small mono font.
>   - Local ICE candidates list: live-updating list of candidate rows. Each row: type badge + IP:port + protocol + priority. Empty state: a soft dashed border with "No candidates yet" text.
> - RIGHT column:
>   - Chat panel: scrollable message area with "me" bubbles right-aligned (blue) and "peer" bubbles left-aligned (white with border). Input + send button at the bottom.
>   - Event log: a small monospace console showing timestamped events (gathering: complete, ice: checking, peer: connected, etc.). Dark background, terminal-like.
>
> **Two-card role selector** (shown before user has picked a role)
> - Two cards side-by-side: "Peer A (Offerer)" and "Peer B (Answerer)" with a button on each.
>
> **Style direction**
> - Same color palette as landing page. Status chips should be visually distinctive but quiet.
> - The event log is the only dark element on the page — it should feel like Chrome DevTools.
> - Mobile: collapse to single column, signaling above chat.

---

## 3. Candidate explorer page (`/candidates`)

> Design a **candidate inspector tool** for WebRTC ICE. Single peer. The user clicks a button, candidates are gathered against public STUN servers, and each candidate is displayed as a parsed card.
>
> **Header**
> - Title: "Candidate explorer"
> - 2-sentence intro.
> - A primary button: "Gather candidates" (when busy, shows spinner + "Gathering...").
> - A small timing readout: "Completed in 247 ms".
>
> **Summary row** (shown after gathering)
> - Horizontal row of pill chips, one per candidate type found, showing the count: e.g. `host ×3`, `srflx ×1`, `relay ×0`.
>
> **Candidate cards** (one per candidate)
> - Card header: type badge + `IP:port` in mono + protocol (UDP/TCP) as a small uppercase tag.
> - One-line description of what this type means.
> - A 4-column grid of small key/value fields: Foundation, Component, Priority, Related (raddr:rport).
> - Collapsible "Raw SDP" section that, when expanded, shows the raw candidate string in a dark code block.
>
> **Below the cards**
> - A "What the fields mean" reference section: definition list of Foundation, Component, Priority, Related address.
>
> **Style direction**
> - Cards should feel like a database row inspector. Tight, dense, readable.
> - Use a slight color tint on cards by candidate type (very subtle background tint, ~5% opacity of the badge color).
> - The 4-column fields grid is the visual centerpiece of each card.

---

## 4. Limitations page (`/limitations`)

> Design a **long-form technical article page** that lists 7 limitations of WebRTC ICE, each with severity, an explanation, and a "Why this exists" deep-dive callout.
>
> **Page header**
> - Title: "Why ICE doesn't always work"
> - Lead paragraph: 2 sentences setting up that ICE is the best we have but fails 8–15% of the time.
>
> **Limitation sections** (7 in a vertical stack, each its own card)
> - Numbered circle on the left (1–7) like a step indicator.
> - Title + a severity pill (High = red, Medium = amber, Low = slate) inline next to the title.
> - 1–3 paragraphs of body copy. Use inline `<code>` styling for technical terms.
> - At the bottom of each card: a "Why" callout — a left-bordered quote box with a soft ice-blue background and a short sentence explaining the root cause.
>
> **Practical takeaways section** (at the end)
> - Bulleted list of 5 actionable recommendations.
> - Slightly different background to distinguish it as a summary.
>
> **Style direction**
> - This is the most text-heavy page. Optimize for reading: 65–75 character line length max, comfortable line-height (1.6), strong heading hierarchy.
> - The "Why" callouts are the visual anchor — use them to break up the wall of text.
> - Severity pills should be unambiguous at a glance (color + label).
> - Consider a small table of contents on the left rail (desktop only) for jumping between limitations.

---

## 5. Optional: global components / design system

> Design a small **design system reference** for this app showing the reusable pieces:
>
> - **Candidate badges**: 4 variants (host, srflx, prflx, relay) + 1 unknown. Small, pill-shaped, mono font, with a colored border and background tint.
> - **Status chips**: 4 state variants (default, success, warning, error) shown with an example label and value.
> - **State bar**: full row of 4 chips as it appears in the demo.
> - **Code block**: dark terminal-style block with mono font.
> - **Callout boxes**: info (blue), warning (amber), error (rose) — each with a leading icon slot.
> - **Button styles**: primary (ice-blue solid), secondary (outline), ghost (text-only).
>
> Lay them out on a single Figma frame with labels, hex codes, and font sizes. This becomes the source of truth for any future page.

---

## Tips for using these prompts

- Feed one page at a time. Don't ask Claude Design to generate all 5 in one shot — the output gets diluted.
- After the first generation, ask for variations on the hero / state bar / cards specifically. Iterate on one component at a time.
- If you want a darker theme, prepend: *"Design a dark-mode-first version, with `#0f172a` background and `#38bdf8` accent."*
- The candidate-type colors (emerald/blue/purple/amber) are load-bearing — they're how a user mentally classifies the data. Keep them consistent across pages.
