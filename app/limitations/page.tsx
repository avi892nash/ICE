import type { Metadata } from "next";
import {
  buildBreadcrumbs,
  buildLearningResource,
  JsonLdScript,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Limitations & failure modes",
  description:
    "Seven reasons WebRTC ICE fails in production: symmetric NAT, TURN economics, IP leakage, setup latency, signaling burden, ICE-restart pain, and the absent trust model. Each with severity, mechanism, and why it exists.",
  alternates: { canonical: "/limitations" },
  openGraph: {
    title: "Why ICE doesn't always work",
    description:
      "ICE fails 8–15% of the time in production. Here are the seven mechanisms and what they cost.",
    url: "/limitations",
  },
};

const learningResource = buildLearningResource({
  path: "/limitations",
  name: "WebRTC ICE Limitations and Failure Modes",
  description:
    "Field guide to the seven mechanisms that cause WebRTC ICE to fail in production: symmetric NAT, TURN economics, IP leakage, setup latency, signaling burden, ICE-restart pain, and the absent trust model. Each entry explains the mechanism, severity, and why the protocol can't fix it cleanly.",
  learningResourceType: ["Case Study", "Reference"],
  teaches: [
    "Why symmetric NAT defeats STUN-based traversal",
    "The economics of running a TURN relay",
    "How WebRTC leaks local IP addresses and mDNS mitigations",
    "Sources of ICE connection setup latency",
    "The signaling channel as an unavoidable backend dependency",
    "Cost of ICE restart on network changes",
    "Why WebRTC has no built-in identity / trust model",
  ],
  timeRequired: "PT15M",
  interactivityType: "expositive",
  educationalLevel: "advanced",
});

const breadcrumbs = buildBreadcrumbs([
  { name: "Overview", path: "/" },
  { name: "Limitations & failure modes", path: "/limitations" },
]);

export default function LimitationsPage() {
  return (
    <div className="space-y-10">
      <JsonLdScript id="ld-json-page" data={learningResource} />
      <JsonLdScript id="ld-json-breadcrumbs" data={breadcrumbs} />
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Why ICE doesn't always work
        </h1>
        <p className="text-slate-600 max-w-3xl">
          ICE is the best general-purpose NAT traversal protocol we have, but
          it makes hard tradeoffs. Real-world deployments still see 8–15% of
          connections fall back to relay or fail entirely. Here's why — and
          what each failure mode costs.
        </p>
      </div>

      <Limitation
        n={1}
        title="Symmetric NATs break direct paths"
        severity="High"
        body={
          <>
            <p>
              STUN tells you the public IP:port your NAT mapped your local
              socket to. With cone NATs, that mapping is reused for any remote
              host, so a peer can hit you on it. With{" "}
              <strong>symmetric NATs</strong>, the NAT picks a{" "}
              <em>different</em> mapping per destination. The address STUN
              reported is useless to your peer because the NAT won't accept
              packets from them on it.
            </p>
            <p className="mt-2">
              When both peers sit behind symmetric NATs, no direct path exists.
              The only option is a TURN relay.
            </p>
          </>
        }
        why="STUN was designed for endpoint discovery, not for the case where the NAT's mapping is keyed on (src, dst) instead of (src). Symmetric NATs are common in carrier-grade NAT (CGNAT) and enterprise firewalls."
      />

      <Limitation
        n={2}
        title="TURN relays are expensive"
        severity="High"
        body={
          <>
            <p>
              When direct paths fail, traffic is forwarded through a TURN
              server. The server pays for every byte both ways — a single
              720p video call can push 1–3 Mbps for 30+ minutes, so a busy
              service spends real money on bandwidth.
            </p>
            <p className="mt-2">
              You also have to run TURN servers globally and route users to a
              nearby one, or latency tanks. Coturn is the open-source option;
              hosted (Xirsys, Twilio NTS) is easier but pricier per GB.
            </p>
          </>
        }
        why="Relaying defeats the cost benefit of P2P. The relay rate is the metric that determines whether a WebRTC product is economically viable at scale."
      />

      <Limitation
        n={3}
        title="ICE leaks the user's local IP"
        severity="Medium"
        body={
          <>
            <p>
              The browser exposes host candidates — your real LAN address —
              through the SDP. Even without a connection, an offer reveals
              local interfaces. This was historically usable to fingerprint
              users behind VPNs.
            </p>
            <p className="mt-2">
              Modern browsers mitigate via{" "}
              <code className="bg-slate-100 px-1 text-xs">
                mDNS-ified
              </code>{" "}
              candidates (Chrome since 76): a host address like{" "}
              <code className="bg-slate-100 px-1 text-xs">
                abc123.local
              </code>{" "}
              that only the peer can resolve. This breaks tooling that expects
              IPs and adds resolution latency.
            </p>
          </>
        }
        why="WebRTC's design predates the modern privacy threat model. The mDNS fix is a workaround that papers over the SDP semantics rather than redesigning them."
      />

      <Limitation
        n={4}
        title="Connection setup is slow and bursty"
        severity="Medium"
        body={
          <>
            <p>
              Gathering takes 100–3000 ms depending on STUN RTT and the number
              of interfaces. Connectivity checks add another round trip for
              every candidate pair. For a 1-on-1 call with 4 candidates each
              side, that's 16 paired checks running concurrently.
            </p>
            <p className="mt-2">
              Trickle ICE helps by streaming candidates as they're gathered
              (instead of waiting for the full set), but you still pay for the
              slowest viable path before you know it works.
            </p>
          </>
        }
        why="ICE prioritizes finding any working path over finding it fast. There's no shortcut: you have to try."
      />

      <Limitation
        n={5}
        title="Out-of-band signaling is your problem"
        severity="Medium"
        body={
          <>
            <p>
              ICE produces an SDP blob; getting it to the other peer is not
              ICE's job. You need a signaling channel — usually a WebSocket
              server with presence, room state, and reconnection. That server
              is a single point of failure for connection establishment, even
              if the data plane is P2P.
            </p>
            <p className="mt-2">
              This demo uses copy-paste to make signaling visible, but
              production apps need real infrastructure here.
            </p>
          </>
        }
        why="The IETF deliberately scoped signaling out of WebRTC so it could be carried over anything (SIP, XMPP, custom). The result is that every team has to build it themselves."
      />

      <Limitation
        n={6}
        title="ICE restarts on network changes are clunky"
        severity="Low"
        body={
          <>
            <p>
              Switching from Wi-Fi to LTE invalidates your candidates. ICE
              supports a restart procedure to re-gather and re-check, but it
              takes seconds and may briefly drop the data plane. Mobile users
              feel this every time they walk out of range.
            </p>
          </>
        }
        why="The protocol assumes a relatively stable network. The mobile reality is constant churn."
      />

      <Limitation
        n={7}
        title="No first-class auth or trust model"
        severity="Low"
        body={
          <>
            <p>
              ICE has{" "}
              <code className="bg-slate-100 px-1 text-xs">ufrag</code> and{" "}
              <code className="bg-slate-100 px-1 text-xs">pwd</code> for STUN
              message integrity within a session, but it doesn't authenticate
              peers. Identity is delegated to the application layer (and
              usually the signaling server). Mis-configured apps can let
              attackers inject candidates or hijack sessions.
            </p>
          </>
        }
        why="ICE is a connectivity protocol, not a trust protocol. DTLS-SRTP secures the data plane after the connection is up, but the handshake itself isn't authenticated."
      />

      <section className="mt-12 border-t border-slate-200 pt-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          Practical takeaways
        </h2>
        <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside max-w-3xl">
          <li>
            <strong>Always provision TURN.</strong> Plan for 10–20% of your
            connections to relay. Budget for the bandwidth.
          </li>
          <li>
            <strong>Use trickle ICE.</strong> Don't wait for full gathering
            before sending the offer.
          </li>
          <li>
            <strong>Monitor relay rate by network.</strong> A spike usually
            means a carrier rolled out new CGNAT.
          </li>
          <li>
            <strong>Don't roll your own signaling.</strong> Use a battle-tested
            library (Socket.IO, Ably, Pusher) unless you need custom routing.
          </li>
          <li>
            <strong>For 1:many or many:many, consider an SFU.</strong> P2P mesh
            scales as N² and gets unusable past 4–6 peers.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Limitation({
  n,
  title,
  severity,
  body,
  why,
}: {
  n: number;
  title: string;
  severity: "Low" | "Medium" | "High";
  body: React.ReactNode;
  why: string;
}) {
  const sevColor =
    severity === "High"
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : severity === "Medium"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <section className="border border-slate-200 rounded-lg p-6 bg-white">
      <div className="flex items-start gap-4 mb-3">
        <div className="w-8 h-8 rounded-full bg-ice-100 text-ice-700 flex items-center justify-center text-sm font-bold shrink-0">
          {n}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sevColor}`}
            >
              {severity}
            </span>
          </div>
        </div>
      </div>
      <div className="text-sm text-slate-700 space-y-2 ml-12">{body}</div>
      <div className="mt-4 ml-12 border-l-2 border-ice-200 pl-3 text-sm text-slate-600 bg-ice-50/40 py-2 rounded-r">
        <strong className="text-ice-800">Why:</strong> {why}
      </div>
    </section>
  );
}
