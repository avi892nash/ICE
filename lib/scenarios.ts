import type { CandidateType } from "./webrtc";

export type Side = "A" | "B";

export interface SimCandidate {
  id: string;
  side: Side;
  type: CandidateType;
  address: string;
  port: number;
  priority: number; // simplified — already computed
}

export interface SimPair {
  id: string;
  localId: string;
  remoteId: string;
  priority: number; // pair priority
  state: "frozen" | "waiting" | "in-progress" | "succeeded" | "failed";
  nominated?: boolean;
}

export type SimEventKind =
  | "start"
  | "gather"
  | "signal"
  | "pair"
  | "check-start"
  | "check-result"
  | "nominate"
  | "selected"
  | "done";

export type WireProtocol = "STUN" | "TURN" | "SDP" | "DTLS" | "SCTP" | "ICE";

export interface PacketField {
  name: string;
  value: string;
  hint?: string;
}

export interface SimPacket {
  from: Side | "stun" | "turn" | "signal";
  to: Side | "stun" | "turn" | "signal";
  /** Short label rendered on the line in the canvas */
  label: string;
  /** Wire protocol family this packet belongs to */
  protocol?: WireProtocol;
  /** Specific message type within the protocol (e.g. "Binding Request") */
  protocolDetail?: string;
  /** From / To with actual IP:port pairs as a string (for the inspector) */
  fromAddr?: string;
  toAddr?: string;
  /** Important header fields / attributes */
  fields?: PacketField[];
  /** Plain-English explanation of what this packet accomplishes */
  purpose?: string;
}

export interface SimEvent {
  kind: SimEventKind;
  /** What's happening — rendered as the step title */
  title: string;
  /** 1–2 sentence explainer with the RFC mechanic involved */
  body: string;
  /** Mutations applied to sim state when this event fires */
  add?: SimCandidate[];
  pair?: SimPair[];
  pairUpdate?: { id: string; state: SimPair["state"]; nominated?: boolean }[];
  /** Animate a packet between these endpoints */
  packet?: SimPacket;
  /** When this scenario finishes — selected pair id */
  selectedPairId?: string | null;
}

export interface Scenario {
  id: string;
  name: string;
  summary: string;
  topology: {
    a: { ip: string; behind: NatKind | null };
    b: { ip: string; behind: NatKind | null };
    natShared?: boolean;
    publicA?: string;
    publicB?: string;
  };
  outcome: "direct-host" | "direct-srflx" | "relay" | "failed";
  events: SimEvent[];
}

export type NatKind = "cone" | "symmetric" | "no-hairpin";

// Priority formula (RFC 8445 §5.1.2.1):
// priority = (2^24) * type_pref + (2^8) * local_pref + (2^0) * (256 - component)
// Type preferences (default): host=126, srflx=100, prflx=110, relay=0
const tp = { host: 126, srflx: 100, prflx: 110, relay: 0 };
const localPref = 65535;
const component = 1;
const prio = (t: keyof typeof tp) =>
  Math.pow(2, 24) * tp[t] + Math.pow(2, 8) * localPref + (256 - component);

// Pair priority (RFC 8445 §6.1.2.3):
// pair_priority = 2^32 * MIN(G,D) + 2 * MAX(G,D) + (G>D ? 1 : 0)
// G = controlling agent priority, D = controlled agent priority.
// We hard-code A as controlling. To keep numbers readable, we just use min/max formula.
const pairPrio = (g: number, d: number) => {
  const min = Math.min(g, d);
  const max = Math.max(g, d);
  return min * 2 + max + (g > d ? 1 : 0);
};

// --- Scenario 1: Same LAN ---
export const SCENARIO_LAN: Scenario = {
  id: "lan",
  name: "Same LAN",
  summary:
    "Both peers on the same Wi-Fi. Host candidates can reach each other directly. No NAT traversal needed.",
  topology: {
    a: { ip: "192.168.1.10", behind: null },
    b: { ip: "192.168.1.20", behind: null },
    natShared: true,
    publicA: "203.0.113.5",
    publicB: "203.0.113.5",
  },
  outcome: "direct-host",
  events: [
    {
      kind: "start",
      title: "Peers create RTCPeerConnection",
      body: "Each peer constructs an RTCPeerConnection with the same ICE server list (STUN + optional TURN). No traffic on the wire yet.",
    },
    {
      kind: "gather",
      title: "Alice gathers candidates",
      body: "ICE enumerates network interfaces. For each one it produces a host candidate, then sends STUN binding requests to each STUN server to discover server-reflexive (public) candidates.",
      add: [
        {
          id: "a-host",
          side: "A",
          type: "host",
          address: "192.168.1.10",
          port: 54321,
          priority: prio("host"),
        },
      ],
      packet: {
        from: "A",
        to: "stun",
        label: "STUN Binding Request",
        protocol: "STUN",
        protocolDetail: "Binding Request",
        fromAddr: "192.168.1.10:54321",
        toAddr: "stun.l.google.com:19302",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          { name: "Message Length", value: "0 bytes" },
          { name: "Magic Cookie", value: "0x2112A442" },
          {
            name: "Transaction ID",
            value: "6c8a5d1f...",
            hint: "96-bit random, used to match the response",
          },
        ],
        purpose:
          "Ask the STUN server: 'what public IP:port do you see me coming from?' No payload — the server just inspects the source address of the packet itself.",
      },
    },
    {
      kind: "gather",
      title: "STUN reflects Alice's public IP",
      body: "The STUN server echoes back the public IP and port it saw — that becomes Alice's srflx candidate. Since both peers share a router here, both srflx addresses use the same public IP.",
      add: [
        {
          id: "a-srflx",
          side: "A",
          type: "srflx",
          address: "203.0.113.5",
          port: 12345,
          priority: prio("srflx"),
        },
      ],
      packet: {
        from: "stun",
        to: "A",
        label: "STUN Binding Response",
        protocol: "STUN",
        protocolDetail: "Binding Success Response",
        fromAddr: "stun.l.google.com:19302",
        toAddr: "192.168.1.10:54321",
        fields: [
          { name: "Message Type", value: "0x0101 (Binding Success)" },
          { name: "Message Length", value: "12 bytes" },
          {
            name: "XOR-MAPPED-ADDRESS",
            value: "203.0.113.5:12345",
            hint: "Alice's public IP+port as seen by the STUN server. XOR'd with magic cookie to prevent NAT rewriting.",
          },
        ],
        purpose:
          "The reply that turns into the srflx candidate. The XOR-MAPPED-ADDRESS is the one piece of useful information.",
      },
    },
    {
      kind: "gather",
      title: "Bob gathers candidates in parallel",
      body: "Same process on Bob's side. ICE gathering runs concurrently; trickle ICE means each candidate can be sent to the peer the moment it's discovered, without waiting for the full set.",
      add: [
        {
          id: "b-host",
          side: "B",
          type: "host",
          address: "192.168.1.20",
          port: 54322,
          priority: prio("host"),
        },
        {
          id: "b-srflx",
          side: "B",
          type: "srflx",
          address: "203.0.113.5",
          port: 12346,
          priority: prio("srflx"),
        },
      ],
    },
    {
      kind: "signal",
      title: "SDP offer/answer exchange",
      body: "Both peers send their SDP (containing all gathered candidates) through the signaling channel — out-of-band, ICE doesn't define this transport. Typically a WebSocket.",
      packet: {
        from: "A",
        to: "signal",
        label: "SDP Offer",
        protocol: "SDP",
        protocolDetail: "Offer (over WebSocket / app channel)",
        fromAddr: "Alice",
        toAddr: "signaling server",
        fields: [
          { name: "v=", value: "0" },
          { name: "o=", value: "- 6543210 2 IN IP4 192.168.1.10" },
          {
            name: "m=",
            value: "application 9 UDP/DTLS/SCTP webrtc-datachannel",
          },
          { name: "a=ice-ufrag", value: "kxN9", hint: "ICE username fragment" },
          {
            name: "a=ice-pwd",
            value: "v3...64chars",
            hint: "ICE password used in MESSAGE-INTEGRITY",
          },
          {
            name: "a=candidate:1",
            value: "1 udp 2113937151 192.168.1.10 54321 typ host",
          },
          {
            name: "a=candidate:2",
            value: "1 udp 1677729535 203.0.113.5 12345 typ srflx raddr 192.168.1.10 rport 54321",
          },
        ],
        purpose:
          "The candidate list rides inside the SDP. ICE doesn't define how this gets to the peer — apps use WebSocket, SIP, or even copy-paste (like the live demo on this site).",
      },
    },
    {
      kind: "signal",
      title: "Answer delivered to Alice",
      body: "Bob processes the offer, generates an answer, and ships it back. Now both sides know the other's candidates.",
      packet: {
        from: "signal",
        to: "A",
        label: "SDP Answer",
        protocol: "SDP",
        protocolDetail: "Answer",
        fromAddr: "signaling server",
        toAddr: "Alice",
        fields: [
          { name: "v=", value: "0" },
          { name: "o=", value: "- 1122334 2 IN IP4 192.168.1.20" },
          { name: "a=ice-ufrag", value: "8mTp" },
          { name: "a=ice-pwd", value: "Hq...64chars" },
          {
            name: "a=candidate:1",
            value: "1 udp 2113937151 192.168.1.20 54322 typ host",
          },
          {
            name: "a=candidate:2",
            value: "1 udp 1677729535 203.0.113.5 12346 typ srflx",
          },
        ],
        purpose:
          "Bob's matching SDP with HIS candidates. Now both peers have each other's lists and can form candidate pairs.",
      },
    },
    {
      kind: "pair",
      title: "Form candidate pairs",
      body: "ICE forms the cartesian product of local × remote candidates (after pruning by address family). Each pair gets a priority via: pair_priority = 2³² · MIN(G,D) + 2 · MAX(G,D) + (G>D ? 1 : 0). Pairs are checked in priority order.",
      pair: [
        {
          id: "p-hh",
          localId: "a-host",
          remoteId: "b-host",
          priority: pairPrio(prio("host"), prio("host")),
          state: "waiting",
        },
        {
          id: "p-hs",
          localId: "a-host",
          remoteId: "b-srflx",
          priority: pairPrio(prio("host"), prio("srflx")),
          state: "frozen",
        },
        {
          id: "p-sh",
          localId: "a-srflx",
          remoteId: "b-host",
          priority: pairPrio(prio("srflx"), prio("host")),
          state: "frozen",
        },
        {
          id: "p-ss",
          localId: "a-srflx",
          remoteId: "b-srflx",
          priority: pairPrio(prio("srflx"), prio("srflx")),
          state: "frozen",
        },
      ],
    },
    {
      kind: "check-start",
      title: "Connectivity check: host ↔ host",
      body: "Highest-priority pair runs first. Alice sends a STUN binding request directly to Bob's host candidate. On a shared LAN this is a single hop through the switch.",
      pairUpdate: [{ id: "p-hh", state: "in-progress" }],
      packet: {
        from: "A",
        to: "B",
        label: "ICE Connectivity Check",
        protocol: "ICE",
        protocolDetail: "STUN Binding Request with ICE attributes",
        fromAddr: "192.168.1.10:54321",
        toAddr: "192.168.1.20:54322",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          {
            name: "USERNAME",
            value: "8mTp:kxN9",
            hint: "<remote-ufrag>:<local-ufrag>",
          },
          {
            name: "PRIORITY",
            value: "1853824767",
            hint: "Local candidate's priority",
          },
          {
            name: "ICE-CONTROLLING",
            value: "tie-breaker 0x7F23...",
            hint: "Alice is the controlling agent",
          },
          {
            name: "MESSAGE-INTEGRITY",
            value: "HMAC-SHA1 with ice-pwd",
            hint: "Proves the sender knows Bob's ice-pwd",
          },
          { name: "FINGERPRINT", value: "CRC-32" },
        ],
        purpose:
          "Same STUN protocol as gathering, but addressed peer-to-peer with extra ICE attributes that authenticate and prioritize the check.",
      },
    },
    {
      kind: "check-result",
      title: "host ↔ host check succeeds",
      body: "Bob responds. Alice marks the pair Succeeded. Bob's reciprocal check also succeeds — connectivity is symmetric.",
      pairUpdate: [{ id: "p-hh", state: "succeeded" }],
      packet: {
        from: "B",
        to: "A",
        label: "STUN Binding Response",
        protocol: "ICE",
        protocolDetail: "STUN Binding Success Response",
        fromAddr: "192.168.1.20:54322",
        toAddr: "192.168.1.10:54321",
        fields: [
          { name: "Message Type", value: "0x0101 (Success)" },
          {
            name: "XOR-MAPPED-ADDRESS",
            value: "192.168.1.10:54321",
            hint: "What Bob saw as Alice's source — matches her host candidate, no NAT in between",
          },
          { name: "MESSAGE-INTEGRITY", value: "HMAC-SHA1 with ice-pwd" },
        ],
        purpose:
          "Bob's reply confirms the path works. Because XOR-MAPPED-ADDRESS matches Alice's known host candidate, no new peer-reflexive candidate needs to be created.",
      },
    },
    {
      kind: "nominate",
      title: "Controlling agent nominates",
      body: "Alice (controlling) picks the best succeeded pair and sends another check with the USE-CANDIDATE attribute set. This binds the pair as the chosen one for data flow.",
      pairUpdate: [{ id: "p-hh", state: "succeeded", nominated: true }],
      packet: {
        from: "A",
        to: "B",
        label: "USE-CANDIDATE",
        protocol: "ICE",
        protocolDetail: "STUN Binding Request with USE-CANDIDATE",
        fromAddr: "192.168.1.10:54321",
        toAddr: "192.168.1.20:54322",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          {
            name: "USE-CANDIDATE",
            value: "(flag, empty)",
            hint: "Tells Bob: this is the pair we're locking in for data flow",
          },
          { name: "PRIORITY", value: "1853824767" },
          { name: "ICE-CONTROLLING", value: "tie-breaker 0x7F23..." },
          { name: "MESSAGE-INTEGRITY", value: "HMAC-SHA1" },
        ],
        purpose:
          "Same as a regular connectivity check, but the USE-CANDIDATE attribute flips this pair into the 'selected' state once the response comes back.",
      },
    },
    {
      kind: "selected",
      title: "Connection established on host pair",
      body: "DTLS handshake happens on the nominated pair, then SCTP for the data channel. Total time: typically <500 ms on LAN. Traffic never leaves the local network.",
      selectedPairId: "p-hh",
    },
    {
      kind: "done",
      title: "Data flows peer-to-peer",
      body: "From this point on, the data channel sends messages directly between Alice and Bob. The STUN/TURN/signaling servers are out of the data path.",
    },
  ],
};

// --- Scenario 2: Different networks (cone NAT both sides) ---
export const SCENARIO_CONE: Scenario = {
  id: "cone",
  name: "Different networks (cone NAT)",
  summary:
    "Each peer behind a friendly NAT on different ISPs. Host candidates aren't routable across the internet; the srflx pair wins.",
  topology: {
    a: { ip: "192.168.1.10", behind: "cone" },
    b: { ip: "10.0.0.20", behind: "cone" },
    natShared: false,
    publicA: "203.0.113.5",
    publicB: "198.51.100.7",
  },
  outcome: "direct-srflx",
  events: [
    {
      kind: "start",
      title: "Two peers on different networks",
      body: "Alice's home Wi-Fi, Bob's mobile hotspot. Different public IPs, both behind cone NATs (the friendly kind that reuses the same mapping for any destination).",
    },
    {
      kind: "gather",
      title: "Both peers gather candidates",
      body: "Each gathers a host candidate (private LAN IP) and an srflx candidate (public IP, learned via STUN).",
      add: [
        {
          id: "a-host",
          side: "A",
          type: "host",
          address: "192.168.1.10",
          port: 54321,
          priority: prio("host"),
        },
        {
          id: "a-srflx",
          side: "A",
          type: "srflx",
          address: "203.0.113.5",
          port: 33001,
          priority: prio("srflx"),
        },
        {
          id: "b-host",
          side: "B",
          type: "host",
          address: "10.0.0.20",
          port: 54322,
          priority: prio("host"),
        },
        {
          id: "b-srflx",
          side: "B",
          type: "srflx",
          address: "198.51.100.7",
          port: 44002,
          priority: prio("srflx"),
        },
      ],
      packet: {
        from: "A",
        to: "stun",
        label: "STUN Binding Request × 2",
        protocol: "STUN",
        protocolDetail: "Binding Request (both peers in parallel)",
        fromAddr: "Alice + Bob → STUN",
        toAddr: "stun.l.google.com:19302",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          { name: "Magic Cookie", value: "0x2112A442" },
        ],
        purpose:
          "Each peer asks STUN for its own public address. Because they're on different networks, they get different answers (203.0.113.5 for Alice, 198.51.100.7 for Bob).",
      },
    },
    {
      kind: "signal",
      title: "SDP exchange",
      body: "Candidates ride across in the SDP via the signaling server.",
      packet: {
        from: "A",
        to: "signal",
        label: "SDP Offer/Answer",
        protocol: "SDP",
        protocolDetail: "Offer and Answer (via signaling)",
        fromAddr: "Alice/Bob",
        toAddr: "signaling server",
        fields: [
          {
            name: "a=candidate (host)",
            value: "192.168.1.10:54321 typ host",
            hint: "Private — useless to the peer on a different network",
          },
          {
            name: "a=candidate (srflx)",
            value: "203.0.113.5:33001 typ srflx",
            hint: "Public IP discovered via STUN — useful for direct P2P",
          },
        ],
        purpose:
          "Both peers exchange SDPs with each other's candidates. The signaling server is app-controlled — usually a WebSocket.",
      },
    },
    {
      kind: "pair",
      title: "Pairs formed and prioritized",
      body: "4 pairs total. Host ↔ host has the highest priority — ICE always tries it, even when it's obviously useless. There's no shortcut.",
      pair: [
        {
          id: "p-hh",
          localId: "a-host",
          remoteId: "b-host",
          priority: pairPrio(prio("host"), prio("host")),
          state: "waiting",
        },
        {
          id: "p-hs",
          localId: "a-host",
          remoteId: "b-srflx",
          priority: pairPrio(prio("host"), prio("srflx")),
          state: "frozen",
        },
        {
          id: "p-sh",
          localId: "a-srflx",
          remoteId: "b-host",
          priority: pairPrio(prio("srflx"), prio("host")),
          state: "frozen",
        },
        {
          id: "p-ss",
          localId: "a-srflx",
          remoteId: "b-srflx",
          priority: pairPrio(prio("srflx"), prio("srflx")),
          state: "frozen",
        },
      ],
    },
    {
      kind: "check-start",
      title: "host ↔ host check (will fail)",
      body: "Alice fires a STUN binding request at Bob's 10.0.0.20. That's a private RFC1918 address — it's either unroutable on the public internet or hits something unrelated. No response.",
      pairUpdate: [{ id: "p-hh", state: "in-progress" }],
      packet: {
        from: "A",
        to: "B",
        label: "STUN → 10.0.0.20 (unroutable)",
        protocol: "ICE",
        protocolDetail: "STUN Binding Request — host pair attempt",
        fromAddr: "192.168.1.10:54321",
        toAddr: "10.0.0.20:54322 (RFC1918, private)",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          { name: "USERNAME", value: "<remote-ufrag>:<local-ufrag>" },
        ],
        purpose:
          "ICE tries the highest-priority pair first even if it's obviously useless. 10.0.0.20 belongs to Bob's home subnet, not Alice's — the packet has nowhere to go.",
      },
    },
    {
      kind: "check-result",
      title: "host ↔ host check times out",
      body: "After RTO (default 500 ms × retries), the check is marked Failed. ICE continues to lower-priority pairs.",
      pairUpdate: [{ id: "p-hh", state: "failed" }],
    },
    {
      kind: "check-start",
      title: "srflx ↔ srflx check",
      body: "Alice sends a binding request to Bob's public IP. Because Bob's NAT is a cone NAT, it accepts the inbound packet (the mapping created by Bob's outbound STUN request is reusable for any source).",
      pairUpdate: [{ id: "p-ss", state: "in-progress" }],
      packet: {
        from: "A",
        to: "B",
        label: "STUN to Bob's public IP",
        protocol: "ICE",
        protocolDetail: "STUN Binding Request via public path",
        fromAddr: "203.0.113.5:33001 (Alice via her NAT)",
        toAddr: "198.51.100.7:44002 (Bob via his NAT)",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          { name: "USERNAME", value: "8mTp:kxN9" },
          { name: "PRIORITY", value: "1677729535 (srflx)" },
          { name: "ICE-CONTROLLING", value: "tie-breaker" },
          { name: "MESSAGE-INTEGRITY", value: "HMAC-SHA1(ice-pwd)" },
        ],
        purpose:
          "Hole-punching in action: Alice's outbound packet opens a return-path mapping on her NAT, and Bob's earlier STUN request did the same on his side. Both cone NATs accept the incoming check.",
      },
    },
    {
      kind: "check-result",
      title: "srflx ↔ srflx check succeeds",
      body: "Bob's NAT forwards the packet to Bob's host. Bob responds, the response makes it back. Pair is Succeeded.",
      pairUpdate: [{ id: "p-ss", state: "succeeded" }],
      packet: {
        from: "B",
        to: "A",
        label: "STUN Success Response",
        protocol: "ICE",
        protocolDetail: "STUN Binding Success",
        fromAddr: "198.51.100.7:44002",
        toAddr: "203.0.113.5:33001",
        fields: [
          { name: "Message Type", value: "0x0101 (Success)" },
          {
            name: "XOR-MAPPED-ADDRESS",
            value: "203.0.113.5:33001",
            hint: "Confirms Alice's srflx is correctly reachable",
          },
        ],
        purpose:
          "Bob's response confirms the pair works in both directions. The pair moves to Succeeded.",
      },
    },
    {
      kind: "nominate",
      title: "Nominate srflx ↔ srflx",
      body: "Alice sends USE-CANDIDATE on the srflx pair. Both NATs now have a working hole punched through them.",
      pairUpdate: [{ id: "p-ss", state: "succeeded", nominated: true }],
      packet: {
        from: "A",
        to: "B",
        label: "USE-CANDIDATE",
        protocol: "ICE",
        protocolDetail: "STUN Binding Request with USE-CANDIDATE",
        fromAddr: "203.0.113.5:33001",
        toAddr: "198.51.100.7:44002",
        fields: [
          { name: "USE-CANDIDATE", value: "(flag set)" },
          { name: "ICE-CONTROLLING", value: "tie-breaker" },
        ],
        purpose:
          "Locks in this pair as the selected one. From here, all DTLS, SCTP, and application data flows peer-to-peer over the public internet — no relay required.",
      },
    },
    {
      kind: "selected",
      title: "Connected via srflx",
      body: "Direct peer-to-peer over the public internet. No relay. This is what makes WebRTC cheap to operate at scale — when cone NATs cooperate.",
      selectedPairId: "p-ss",
    },
    {
      kind: "done",
      title: "Data flows directly across the internet",
      body: "Both NATs maintain the hole. Each peer sends periodic STUN consent-fresh checks to keep the mapping alive (RFC 7675).",
    },
  ],
};

// --- Scenario 3: Same NAT, no hairpin — needs TURN ---
export const SCENARIO_HAIRPIN: Scenario = {
  id: "hairpin",
  name: "Same NAT, no hairpin (LAN gotcha)",
  summary:
    "Both peers on your home Wi-Fi (what you tried). Host candidates are mDNS-ified so they don't resolve cross-device. srflx fails because your router won't bounce internal packets back. TURN is the only path.",
  topology: {
    a: { ip: "192.168.1.10", behind: "no-hairpin" },
    b: { ip: "192.168.1.20", behind: "no-hairpin" },
    natShared: true,
    publicA: "203.0.113.5",
    publicB: "203.0.113.5",
  },
  outcome: "relay",
  events: [
    {
      kind: "start",
      title: "Two devices, same Wi-Fi",
      body: "Phone and laptop both on your home router. This is the case the README troubleshooting describes — the one that brought you here.",
    },
    {
      kind: "gather",
      title: "Host candidates are mDNS-ified",
      body: "Chrome doesn't expose raw LAN IPs over HTTP. Instead it emits hostnames like 4f27a5e6.local, resolvable only via mDNS — and mDNS resolution often fails across devices on insecure origins.",
      add: [
        {
          id: "a-host",
          side: "A",
          type: "host",
          address: "4f27a5e6.local",
          port: 54321,
          priority: prio("host"),
        },
        {
          id: "b-host",
          side: "B",
          type: "host",
          address: "8af83802.local",
          port: 54322,
          priority: prio("host"),
        },
      ],
    },
    {
      kind: "gather",
      title: "srflx: same public IP for both",
      body: "STUN reports the router's public IP to each peer. Both srflx candidates point at 203.0.113.5 — because that IS the router's outside address for the whole LAN.",
      add: [
        {
          id: "a-srflx",
          side: "A",
          type: "srflx",
          address: "203.0.113.5",
          port: 33001,
          priority: prio("srflx"),
        },
        {
          id: "b-srflx",
          side: "B",
          type: "srflx",
          address: "203.0.113.5",
          port: 33002,
          priority: prio("srflx"),
        },
      ],
      packet: {
        from: "A",
        to: "stun",
        label: "STUN Binding Request",
        protocol: "STUN",
        protocolDetail: "Binding Request",
        fromAddr: "192.168.1.10:54321 → router NAT",
        toAddr: "stun.l.google.com:19302",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          { name: "Magic Cookie", value: "0x2112A442" },
          { name: "Transaction ID", value: "a4f1...96 bits" },
        ],
        purpose:
          "Both peers ask STUN: 'what public IP do you see?'. STUN replies with 203.0.113.5 for both — same router, so same public IP. This is precisely what makes hairpin necessary.",
      },
    },
    {
      kind: "gather",
      title: "TURN allocation",
      body: "Each peer also asks the TURN server for a relayed address. The TURN server allocates a public port and stands by to forward packets between Alice and the allocation.",
      add: [
        {
          id: "a-relay",
          side: "A",
          type: "relay",
          address: "turn.example.com",
          port: 49152,
          priority: prio("relay"),
        },
        {
          id: "b-relay",
          side: "B",
          type: "relay",
          address: "turn.example.com",
          port: 49153,
          priority: prio("relay"),
        },
      ],
      packet: {
        from: "A",
        to: "turn",
        label: "TURN Allocate Request",
        protocol: "TURN",
        protocolDetail: "Allocate Request (RFC 8656)",
        fromAddr: "192.168.1.10:54321",
        toAddr: "turn.example.com:3478",
        fields: [
          { name: "Message Type", value: "0x0003 (Allocate Request)" },
          {
            name: "REQUESTED-TRANSPORT",
            value: "UDP (17)",
            hint: "Allocate a UDP relay address",
          },
          {
            name: "USERNAME",
            value: "openrelayproject",
            hint: "TURN long-term credential",
          },
          { name: "REALM", value: "metered.ca" },
          { name: "MESSAGE-INTEGRITY", value: "HMAC-SHA1(password)" },
        ],
        purpose:
          "TURN extends STUN. The Allocate request asks the server to reserve a public IP:port and forward packets to/from Alice. Response will include XOR-RELAYED-ADDRESS (the relay candidate).",
      },
    },
    {
      kind: "signal",
      title: "SDP exchange",
      body: "All 3 candidate types ship to the peer.",
      packet: {
        from: "A",
        to: "signal",
        label: "SDP Offer",
        protocol: "SDP",
        protocolDetail: "Offer with host + srflx + relay candidates",
        fromAddr: "Alice (192.168.1.10)",
        toAddr: "signaling server",
        fields: [
          { name: "a=ice-ufrag", value: "kxN9" },
          {
            name: "a=candidate:1",
            value: "1 udp 2113937151 4f27a5e6.local 54321 typ host",
            hint: "mDNS-ified — not raw 192.168.1.10",
          },
          {
            name: "a=candidate:2",
            value: "1 udp 1677729535 203.0.113.5 33001 typ srflx",
          },
          {
            name: "a=candidate:3",
            value: "1 udp 16777215 turn.example.com 49152 typ relay",
          },
        ],
        purpose:
          "All three candidate types ride in the SDP. The host candidate is intentionally obfuscated via mDNS (Chrome's privacy fix) which is part of why this scenario fails on direct paths.",
      },
    },
    {
      kind: "pair",
      title: "9 pairs, checked in priority order",
      body: "3 local × 3 remote = 9 pairs. Highest priority first (host-host).",
      pair: [
        {
          id: "p-hh",
          localId: "a-host",
          remoteId: "b-host",
          priority: pairPrio(prio("host"), prio("host")),
          state: "waiting",
        },
        {
          id: "p-ss",
          localId: "a-srflx",
          remoteId: "b-srflx",
          priority: pairPrio(prio("srflx"), prio("srflx")),
          state: "frozen",
        },
        {
          id: "p-rr",
          localId: "a-relay",
          remoteId: "b-relay",
          priority: pairPrio(prio("relay"), prio("relay")),
          state: "frozen",
        },
      ],
    },
    {
      kind: "check-start",
      title: "host ↔ host: mDNS fails to resolve",
      body: "Alice tries to send a STUN check to 8af83802.local. Her browser asks the OS to resolve via mDNS — but the answer never comes back. After timeout, the pair fails.",
      pairUpdate: [{ id: "p-hh", state: "in-progress" }],
    },
    {
      kind: "check-result",
      title: "host pair: Failed",
      body: "Without mDNS resolution, the host candidates are useless even though both peers are physically on the same network segment.",
      pairUpdate: [{ id: "p-hh", state: "failed" }],
    },
    {
      kind: "check-start",
      title: "srflx ↔ srflx: hairpin attempt",
      body: "Alice sends a STUN check to 203.0.113.5 — her own router's public IP. For this to work, the router has to recognize that the destination is one of its own LAN clients and bounce the packet back inside. Many consumer routers don't.",
      pairUpdate: [{ id: "p-ss", state: "in-progress" }],
      packet: {
        from: "A",
        to: "B",
        label: "STUN to router public IP (dropped)",
        protocol: "ICE",
        protocolDetail: "STUN Binding Request — hairpin attempt",
        fromAddr: "192.168.1.10:54321",
        toAddr: "203.0.113.5:33002 (own router's WAN IP)",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          { name: "USERNAME", value: "8mTp:kxN9" },
          { name: "PRIORITY", value: "1853824767" },
          { name: "MESSAGE-INTEGRITY", value: "HMAC-SHA1" },
        ],
        purpose:
          "Alice sends a STUN check to her own router's public IP, hoping it'll be bounced back to Bob inside the LAN. Hairpin NAT (RFC 5128) describes this; many consumer routers don't implement it and silently drop the packet.",
      },
    },
    {
      kind: "check-result",
      title: "srflx pair: Failed",
      body: "Router drops the packet because it doesn't hairpin. ICE moves to the relay pair.",
      pairUpdate: [{ id: "p-ss", state: "failed" }],
    },
    {
      kind: "check-start",
      title: "relay ↔ relay: traffic goes via TURN",
      body: "Alice sends a STUN check to Bob's relay address. The TURN server forwards it to Bob (via Bob's allocation channel). The check succeeds.",
      pairUpdate: [{ id: "p-rr", state: "in-progress" }],
      packet: {
        from: "A",
        to: "turn",
        label: "Connectivity check via TURN",
        protocol: "TURN",
        protocolDetail: "Send Indication wrapping a STUN Binding Request",
        fromAddr: "192.168.1.10:54321",
        toAddr: "turn.example.com:3478",
        fields: [
          { name: "Message Type", value: "0x0016 (Send Indication)" },
          {
            name: "XOR-PEER-ADDRESS",
            value: "turn.example.com:49153 (Bob's allocation)",
          },
          {
            name: "DATA",
            value: "STUN Binding Request bytes",
            hint: "The ICE connectivity check is encapsulated inside",
          },
        ],
        purpose:
          "Alice asks TURN to forward a STUN binding request to Bob's relay allocation. TURN unwraps it, sends to Bob, then wraps Bob's response on the way back.",
      },
    },
    {
      kind: "check-result",
      title: "relay pair: Succeeded",
      body: "TURN allocations on both sides are established. Bob's reciprocal check also succeeds.",
      pairUpdate: [{ id: "p-rr", state: "succeeded" }],
      packet: {
        from: "turn",
        to: "B",
        label: "Data Indication to Bob",
        protocol: "TURN",
        protocolDetail: "Data Indication",
        fromAddr: "turn.example.com",
        toAddr: "192.168.1.20:54322",
        fields: [
          { name: "Message Type", value: "0x0017 (Data Indication)" },
          { name: "XOR-PEER-ADDRESS", value: "turn.example.com:49152" },
          { name: "DATA", value: "STUN Binding Request bytes" },
        ],
        purpose:
          "TURN delivers Alice's check to Bob. Bob's app stack sees a STUN binding request and replies the same way — through TURN.",
      },
    },
    {
      kind: "nominate",
      title: "Nominate relay pair",
      body: "Alice sends USE-CANDIDATE on the relay pair. All data will now flow through the TURN server.",
      pairUpdate: [{ id: "p-rr", state: "succeeded", nominated: true }],
    },
    {
      kind: "selected",
      title: "Connected via relay",
      body: "The data path is: Alice → router → TURN server → router → Bob. Every byte passes through the relay. Bandwidth cost is real, but the connection works.",
      selectedPairId: "p-rr",
    },
    {
      kind: "done",
      title: "Done — but at the cost of relay bandwidth",
      body: "Same physical room, 6+ hops each way. This is exactly why production WebRTC apps budget for TURN bandwidth — even ideal users sometimes can't avoid it.",
    },
  ],
};

// --- Scenario 4: Symmetric NATs — same as hairpin outcome but for a different reason ---
export const SCENARIO_SYMMETRIC: Scenario = {
  id: "symmetric",
  name: "Symmetric NAT (CGNAT/enterprise)",
  summary:
    "Both peers behind symmetric NATs — common on carrier-grade NAT (mobile networks) and corporate firewalls. The mapping STUN sees is different from the mapping a peer would need.",
  topology: {
    a: { ip: "10.99.0.10", behind: "symmetric" },
    b: { ip: "10.88.0.20", behind: "symmetric" },
    natShared: false,
    publicA: "100.64.5.5",
    publicB: "100.64.7.7",
  },
  outcome: "relay",
  events: [
    {
      kind: "start",
      title: "Symmetric NAT setup",
      body: "Each peer behind a symmetric NAT. Symmetric NATs assign a different public port for each unique destination — a critical detail.",
    },
    {
      kind: "gather",
      title: "STUN reports a mapping that won't work for peers",
      body: "Alice's NAT maps (10.99.0.10:54321 → STUN) as 100.64.5.5:7777. But when Alice later sends to Bob, the NAT will assign a DIFFERENT public port — say 100.64.5.5:9999 — because Bob is a different destination. The srflx candidate STUN gave us is useless to Bob.",
      add: [
        {
          id: "a-host",
          side: "A",
          type: "host",
          address: "10.99.0.10",
          port: 54321,
          priority: prio("host"),
        },
        {
          id: "a-srflx",
          side: "A",
          type: "srflx",
          address: "100.64.5.5",
          port: 7777,
          priority: prio("srflx"),
        },
        {
          id: "a-relay",
          side: "A",
          type: "relay",
          address: "turn.example.com",
          port: 49152,
          priority: prio("relay"),
        },
        {
          id: "b-host",
          side: "B",
          type: "host",
          address: "10.88.0.20",
          port: 54322,
          priority: prio("host"),
        },
        {
          id: "b-srflx",
          side: "B",
          type: "srflx",
          address: "100.64.7.7",
          port: 8888,
          priority: prio("srflx"),
        },
        {
          id: "b-relay",
          side: "B",
          type: "relay",
          address: "turn.example.com",
          port: 49153,
          priority: prio("relay"),
        },
      ],
      packet: {
        from: "A",
        to: "stun",
        label: "STUN Binding Request",
        protocol: "STUN",
        fromAddr: "10.99.0.10:54321 → 100.64.5.5:7777 (NAT-A maps)",
        toAddr: "stun.l.google.com:19302",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
        ],
        purpose:
          "Critical detail: this STUN request creates a NAT mapping keyed to (Alice's address, STUN's address). The NAT will only reuse this mapping if Alice sends to the SAME destination — which a peer won't be.",
      },
    },
    {
      kind: "signal",
      title: "SDP exchange",
      body: "Candidates pass through signaling.",
      packet: {
        from: "A",
        to: "signal",
        label: "SDP",
        protocol: "SDP",
        fromAddr: "Alice/Bob",
        toAddr: "signaling server",
        fields: [
          {
            name: "a=candidate (srflx)",
            value: "100.64.5.5:7777 typ srflx",
            hint: "What STUN told Alice — but this mapping won't accept packets from Bob",
          },
          {
            name: "a=candidate (relay)",
            value: "turn.example.com:49152 typ relay",
            hint: "The actual escape hatch for symmetric NATs",
          },
        ],
        purpose:
          "Same candidate exchange as the other scenarios. But the srflx candidate is misleading — it's the public address STUN saw, not the one Bob would see if he tried.",
      },
    },
    {
      kind: "pair",
      title: "Pairs formed",
      body: "Same 9 pairs. We'll show what happens on the srflx pair to make the symmetric-NAT failure mechanic clear.",
      pair: [
        {
          id: "p-hh",
          localId: "a-host",
          remoteId: "b-host",
          priority: pairPrio(prio("host"), prio("host")),
          state: "waiting",
        },
        {
          id: "p-ss",
          localId: "a-srflx",
          remoteId: "b-srflx",
          priority: pairPrio(prio("srflx"), prio("srflx")),
          state: "frozen",
        },
        {
          id: "p-rr",
          localId: "a-relay",
          remoteId: "b-relay",
          priority: pairPrio(prio("relay"), prio("relay")),
          state: "frozen",
        },
      ],
    },
    {
      kind: "check-start",
      title: "host ↔ host fails (private addresses)",
      body: "Different private subnets, no route.",
      pairUpdate: [{ id: "p-hh", state: "in-progress" }],
    },
    {
      kind: "check-result",
      title: "host pair: Failed",
      body: "",
      pairUpdate: [{ id: "p-hh", state: "failed" }],
    },
    {
      kind: "check-start",
      title: "srflx ↔ srflx: Alice's NAT remaps",
      body: "Alice sends a STUN binding request from (10.99.0.10:54321) to Bob's srflx (100.64.7.7:8888). Her symmetric NAT sees a new destination and assigns a new mapping: 100.64.5.5:9999. Bob's NAT is expecting traffic from 100.64.5.5:7777 (what STUN reported), so it drops Alice's packet.",
      pairUpdate: [{ id: "p-ss", state: "in-progress" }],
      packet: {
        from: "A",
        to: "B",
        label: "STUN — NAT remapped source",
        protocol: "ICE",
        protocolDetail: "STUN Binding Request — port remapped by symmetric NAT",
        fromAddr: "100.64.5.5:9999 (NEW mapping, not the :7777 STUN saw)",
        toAddr: "100.64.7.7:8888 (Bob's srflx)",
        fields: [
          { name: "Message Type", value: "0x0001 (Binding Request)" },
          {
            name: "Source (post-NAT)",
            value: "100.64.5.5:9999",
            hint: "Different from what Bob expected based on SDP",
          },
          {
            name: "USERNAME",
            value: "8mTp:kxN9",
            hint: "Still valid — auth is independent of mapping",
          },
        ],
        purpose:
          "Alice's symmetric NAT assigns a brand-new public port for each unique destination. Bob expected packets to arrive from :7777 (from the SDP) — instead they arrive from :9999. His firewall has no rule for the new source and drops the packet.",
      },
    },
    {
      kind: "check-result",
      title: "srflx pair: Failed — peer-reflexive learned",
      body: "Bob's NAT might still surface the unexpected source as a peer-reflexive candidate, but with both peers symmetric, even prflx checks loop into more NAT remapping. No direct path exists.",
      pairUpdate: [{ id: "p-ss", state: "failed" }],
    },
    {
      kind: "check-start",
      title: "relay ↔ relay",
      body: "TURN relays don't care about NAT type. Alice tells the TURN server: 'Send this to Bob's relay address.' The TURN server does it.",
      pairUpdate: [{ id: "p-rr", state: "in-progress" }],
      packet: {
        from: "A",
        to: "turn",
        label: "TURN Send Indication",
        protocol: "TURN",
        protocolDetail: "Send Indication wrapping ICE check",
        fromAddr: "10.99.0.10:54321 (via NAT)",
        toAddr: "turn.example.com:3478",
        fields: [
          { name: "Message Type", value: "0x0016 (Send Indication)" },
          { name: "XOR-PEER-ADDRESS", value: "turn.example.com:49153" },
          { name: "DATA", value: "STUN Binding Request bytes" },
        ],
        purpose:
          "Alice has an authenticated channel to the TURN server (established at allocation time). She wraps the ICE check inside a TURN Send Indication; TURN unwraps and relays to Bob.",
      },
    },
    {
      kind: "check-result",
      title: "relay pair: Succeeded",
      body: "Both reciprocal checks succeed.",
      pairUpdate: [{ id: "p-rr", state: "succeeded" }],
    },
    {
      kind: "nominate",
      title: "Nominate relay pair",
      body: "USE-CANDIDATE on the relay.",
      pairUpdate: [{ id: "p-rr", state: "succeeded", nominated: true }],
    },
    {
      kind: "selected",
      title: "Connected via TURN",
      body: "Symmetric NATs are why TURN exists. Without a relay, this connection is impossible.",
      selectedPairId: "p-rr",
    },
    {
      kind: "done",
      title: "Done — would have failed without TURN",
      body: "If the app had no TURN configured, ICE would have hit the failed state and the connection would never establish. ~10–15% of WebRTC connections in production land here.",
    },
  ],
};

export const SCENARIOS: Scenario[] = [
  SCENARIO_LAN,
  SCENARIO_CONE,
  SCENARIO_HAIRPIN,
  SCENARIO_SYMMETRIC,
];
