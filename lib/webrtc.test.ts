import { describe, it, expect } from "vitest";
import {
  parseCandidate,
  encodeSignal,
  decodeSignal,
  CANDIDATE_TYPE_INFO,
  DEFAULT_ICE_SERVERS,
  PUBLIC_STUN_SERVERS,
  OPEN_RELAY_TURN_SERVERS,
  type CandidateType,
  type SignalingPayload,
} from "./webrtc";

describe("parseCandidate", () => {
  it("parses a host candidate", () => {
    const c = parseCandidate(
      "candidate:1 1 udp 2113937151 192.168.1.10 54321 typ host",
    );
    expect(c).toMatchObject({
      foundation: "1",
      component: "1",
      protocol: "udp",
      priority: "2113937151",
      address: "192.168.1.10",
      port: "54321",
      type: "host",
    });
    expect(c.relatedAddress).toBeUndefined();
  });

  it("parses a server-reflexive candidate with raddr/rport", () => {
    const c = parseCandidate(
      "candidate:2 1 udp 1677729535 203.0.113.5 12345 typ srflx raddr 192.168.1.10 rport 54321",
    );
    expect(c.type).toBe("srflx");
    expect(c.address).toBe("203.0.113.5");
    expect(c.relatedAddress).toBe("192.168.1.10");
    expect(c.relatedPort).toBe("54321");
  });

  it("parses a relay candidate", () => {
    const c = parseCandidate(
      "candidate:3 1 udp 16777215 turn.example.com 49152 typ relay",
    );
    expect(c.type).toBe("relay");
    expect(c.address).toBe("turn.example.com");
    expect(c.port).toBe("49152");
  });

  it("parses the network-cost attribute", () => {
    const c = parseCandidate(
      "candidate:1 1 udp 2113937151 192.168.1.10 54321 typ host network-cost 999",
    );
    expect(c.networkCost).toBe("999");
  });

  it("strips an optional leading 'candidate:' prefix and works without it", () => {
    const withPrefix = parseCandidate(
      "candidate:1 1 udp 2113937151 192.168.1.10 54321 typ host",
    );
    const withoutPrefix = parseCandidate(
      "1 1 udp 2113937151 192.168.1.10 54321 typ host",
    );
    expect(withoutPrefix.foundation).toBe("1");
    expect(withoutPrefix.type).toBe("host");
    // Only the `raw` field should differ between the two.
    expect({ ...withoutPrefix, raw: "" }).toEqual({ ...withPrefix, raw: "" });
  });

  it("preserves the original string in `raw`", () => {
    const raw = "candidate:1 1 udp 2113937151 192.168.1.10 54321 typ host";
    expect(parseCandidate(raw).raw).toBe(raw);
  });

  it("tolerates extra whitespace between fields", () => {
    const c = parseCandidate(
      "candidate:1   1  udp 2113937151  192.168.1.10   54321 typ host",
    );
    expect(c.protocol).toBe("udp");
    expect(c.type).toBe("host");
  });

  it("defaults type to 'unknown' when the typ token is absent", () => {
    const c = parseCandidate("candidate:1 1 udp 2113937151 192.168.1.10 54321");
    expect(c.type).toBe("unknown");
  });

  it("returns empty fields for an empty string without throwing", () => {
    const c = parseCandidate("");
    expect(c.foundation).toBe("");
    expect(c.address).toBe("");
    expect(c.type).toBe("unknown");
    expect(c.raw).toBe("");
  });
});

describe("encodeSignal / decodeSignal", () => {
  it("round-trips an offer", () => {
    const payload: SignalingPayload = { type: "offer", sdp: "v=0\r\no=- 1 2" };
    expect(decodeSignal(encodeSignal(payload))).toEqual(payload);
  });

  it("round-trips an answer", () => {
    const payload: SignalingPayload = { type: "answer", sdp: "v=0\r\na=ice" };
    expect(decodeSignal(encodeSignal(payload))).toEqual(payload);
  });

  it("survives non-ASCII content (the escape/encodeURIComponent dance)", () => {
    const payload: SignalingPayload = {
      type: "offer",
      sdp: "candidate naïve — café 🎥 测试",
    };
    expect(decodeSignal(encodeSignal(payload))).toEqual(payload);
  });

  it("produces base64 with no whitespace", () => {
    const encoded = encodeSignal({ type: "offer", sdp: "hello world" });
    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("tolerates surrounding whitespace/newlines on decode (copy-paste safety)", () => {
    const payload: SignalingPayload = { type: "answer", sdp: "v=0" };
    const encoded = encodeSignal(payload);
    expect(decodeSignal(`\n  ${encoded}\n`)).toEqual(payload);
  });
});

describe("CANDIDATE_TYPE_INFO", () => {
  const allTypes: CandidateType[] = [
    "host",
    "srflx",
    "prflx",
    "relay",
    "unknown",
  ];

  it("has a complete entry for every candidate type", () => {
    for (const type of allTypes) {
      expect(CANDIDATE_TYPE_INFO[type]).toBeDefined();
      expect(CANDIDATE_TYPE_INFO[type].label).toBeTruthy();
      expect(CANDIDATE_TYPE_INFO[type].color).toBeTruthy();
      expect(CANDIDATE_TYPE_INFO[type].description).toBeTruthy();
    }
  });

  it("can describe every type parseCandidate can emit", () => {
    const parsedType = parseCandidate(
      "candidate:1 1 udp 1 1.2.3.4 5 typ srflx",
    ).type;
    expect(CANDIDATE_TYPE_INFO[parsedType]).toBeDefined();
  });
});

describe("ICE server lists", () => {
  it("DEFAULT_ICE_SERVERS = public STUN + Open Relay TURN", () => {
    expect(DEFAULT_ICE_SERVERS).toEqual([
      ...PUBLIC_STUN_SERVERS,
      ...OPEN_RELAY_TURN_SERVERS,
    ]);
  });

  it("includes at least one STUN url", () => {
    const urls = PUBLIC_STUN_SERVERS.flatMap((s) =>
      Array.isArray(s.urls) ? s.urls : [s.urls],
    );
    expect(urls.some((u) => u.startsWith("stun:"))).toBe(true);
  });

  it("ships TURN credentials (otherwise the relay fallback can't allocate)", () => {
    for (const server of OPEN_RELAY_TURN_SERVERS) {
      expect(server.username).toBeTruthy();
      expect(server.credential).toBeTruthy();
    }
  });
});
