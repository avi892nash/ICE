export type CandidateType = "host" | "srflx" | "prflx" | "relay" | "unknown";

export interface ParsedCandidate {
  raw: string;
  foundation: string;
  component: string;
  protocol: string;
  priority: string;
  address: string;
  port: string;
  type: CandidateType;
  relatedAddress?: string;
  relatedPort?: string;
  networkCost?: string;
}

export const PUBLIC_STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export function parseCandidate(candidateStr: string): ParsedCandidate {
  // Format:
  // candidate:foundation component protocol priority address port typ type [raddr X rport Y] [generation Z] ...
  const cleaned = candidateStr.replace(/^candidate:/, "");
  const parts = cleaned.split(/\s+/);

  const parsed: ParsedCandidate = {
    raw: candidateStr,
    foundation: parts[0] ?? "",
    component: parts[1] ?? "",
    protocol: parts[2] ?? "",
    priority: parts[3] ?? "",
    address: parts[4] ?? "",
    port: parts[5] ?? "",
    type: "unknown",
  };

  for (let i = 6; i < parts.length; i++) {
    const token = parts[i];
    const next = parts[i + 1];
    if (token === "typ" && next) {
      parsed.type = next as CandidateType;
    }
    if (token === "raddr" && next) {
      parsed.relatedAddress = next;
    }
    if (token === "rport" && next) {
      parsed.relatedPort = next;
    }
    if (token === "network-cost" && next) {
      parsed.networkCost = next;
    }
  }

  return parsed;
}

export interface CandidateTypeInfo {
  label: string;
  color: string;
  description: string;
}

export const CANDIDATE_TYPE_INFO: Record<CandidateType, CandidateTypeInfo> = {
  host: {
    label: "Host",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description:
      "A local network interface IP. Works when peers are on the same LAN.",
  },
  srflx: {
    label: "Server Reflexive (STUN)",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    description:
      "Your public IP and port as seen by a STUN server. Discovered via NAT traversal.",
  },
  prflx: {
    label: "Peer Reflexive",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    description:
      "Discovered during connectivity checks — when a peer's mapped address differs from what STUN reported.",
  },
  relay: {
    label: "Relay (TURN)",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    description:
      "Traffic is forwarded through a TURN server. Falls back to this when direct paths fail.",
  },
  unknown: {
    label: "Unknown",
    color: "bg-slate-100 text-slate-800 border-slate-300",
    description: "Candidate type could not be parsed.",
  },
};

export function createPeerConnection(
  iceServers: RTCIceServer[] = PUBLIC_STUN_SERVERS,
): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 0,
  });
}

export type SignalingPayload =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string };

export function encodeSignal(payload: SignalingPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodeSignal(encoded: string): SignalingPayload {
  return JSON.parse(decodeURIComponent(escape(atob(encoded.trim()))));
}
