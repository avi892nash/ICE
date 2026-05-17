import { IceSimulator } from "@/components/IceSimulator";

export const metadata = {
  title: "ICE Algorithm — Step-by-step with simulator",
};

export default function AlgorithmPage() {
  return (
    <div className="space-y-12">
      <header>
        <div className="inline-block px-3 py-1 rounded-full bg-ice-100 text-ice-800 text-xs font-medium mb-3">
          RFC 8445 (ICE) + RFC 5389 (STUN) + RFC 8656 (TURN)
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          The ICE algorithm, step by step
        </h1>
        <p className="text-slate-600 max-w-3xl">
          ICE is a deterministic pipeline that turns "two peers want to talk"
          into "a working network path between them." This page documents the
          algorithm at the level of detail you'd need to debug it, and lets you
          watch it run across four common network topologies.
        </p>
      </header>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          1. Gathering — find every possible local address
        </h2>
        <p className="text-slate-700 mb-3">
          When you call <code className="bg-slate-100 px-1">createOffer()</code>{" "}
          (or <code className="bg-slate-100 px-1">addIceCandidate()</code> later
          on with trickle ICE), the browser runs gathering. It enumerates every
          network interface and produces a candidate for each:
        </p>
        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1.5 mb-4 ml-2">
          <li>
            <strong>Host candidate</strong> — the raw interface IP and a
            randomly chosen UDP port. One per interface (Wi-Fi, ethernet,
            cellular, VPN).
          </li>
          <li>
            <strong>Server-reflexive (srflx)</strong> — send a STUN binding
            request from each host candidate to each configured STUN server.
            The response contains the public IP:port the STUN server saw. That
            becomes a candidate.
          </li>
          <li>
            <strong>Relay (relay)</strong> — for each TURN server, send an
            Allocate request. The TURN server assigns a public address on
            itself and stands by to forward packets. That public address is
            the relay candidate.
          </li>
        </ul>

        <Formula
          title="Candidate priority (RFC 8445 §5.1.2.1)"
          formula="priority = (2²⁴) × type_pref + (2⁸) × local_pref + (2⁰) × (256 − component_id)"
          notes={[
            "type_pref defaults: host=126, peer-reflexive=110, server-reflexive=100, relay=0",
            "local_pref defaults to 65535 when there's one address per type per family",
            "component_id is 1 for RTP / data, 2 for legacy RTCP",
          ]}
        />

        <Callout color="amber">
          <strong>Why type preferences look weird.</strong> Host beats srflx
          beats relay because lower-cost paths are preferred. Relay = 0 means
          ICE will try literally anything else first — TURN bandwidth is
          expensive, so we don't use it unless we have to.
        </Callout>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          2. Signaling — exchange the candidate lists
        </h2>
        <p className="text-slate-700 mb-3">
          ICE doesn't specify how peers exchange their candidate lists. You
          drop them into the SDP and ship them via your signaling channel
          (WebSocket, SIP, XMPP, copy-paste — anything). Two modes:
        </p>
        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1.5 mb-4 ml-2">
          <li>
            <strong>Vanilla ICE</strong> — wait for{" "}
            <code className="bg-slate-100 px-1">iceGatheringState</code> to
            become <code className="bg-slate-100 px-1">complete</code>, send
            one big SDP with everything.
          </li>
          <li>
            <strong>Trickle ICE</strong> (RFC 8838) — send the SDP immediately
            with whatever candidates you have, then push more as they're
            discovered. Cuts setup latency by 100s of ms in practice.
          </li>
        </ul>
        <Callout color="slate">
          <strong>This demo uses vanilla ICE.</strong> Trickle is more
          realistic but adds an order-of-events problem when illustrating the
          algorithm — vanilla lets you see all candidates upfront.
        </Callout>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          3. Pair formation — every local × every remote
        </h2>
        <p className="text-slate-700 mb-3">
          Once both sides have the full candidate list, each peer forms the
          cartesian product. With <em>L</em> local and <em>R</em> remote
          candidates, you get <em>L × R</em> pairs (minus pairs pruned for
          address-family mismatch — no IPv4 ↔ IPv6 pairs).
        </p>

        <Formula
          title="Pair priority (RFC 8445 §6.1.2.3)"
          formula="pair_priority = 2³² × MIN(G, D) + 2 × MAX(G, D) + (G > D ? 1 : 0)"
          notes={[
            "G = priority of the controlling agent's candidate",
            "D = priority of the controlled agent's candidate",
            "The asymmetric term (G > D ? 1 : 0) is a tie-breaker so both peers compute the same ordering",
          ]}
        />

        <p className="text-slate-700 mb-3">
          Pairs go into a check list, sorted by priority. Each pair starts in{" "}
          <PairBadge state="frozen" /> state. Pairs sharing the same{" "}
          <em>foundation</em> (same local interface + transport + STUN/TURN
          server) are grouped — only one pair per foundation can be active at a
          time, to avoid hammering NATs with parallel checks.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          4. Connectivity checks — STUN binding requests across pairs
        </h2>
        <p className="text-slate-700 mb-3">
          For each pair in priority order, the agent sends a STUN binding
          request from its local candidate to the remote candidate. Two kinds
          of checks:
        </p>
        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1.5 mb-4 ml-2">
          <li>
            <strong>Triggered checks</strong> run immediately when a peer
            receives a check from the other side (RFC 8445 §7.3.1.4) — this is
            how "simultaneous open" works through NATs.
          </li>
          <li>
            <strong>Ordinary checks</strong> run on a pacing timer (default
            Ta = 50 ms) from the frozen → waiting → in-progress pipeline.
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Pair state machine
        </h3>
        <div className="overflow-x-auto mb-4">
          <table className="text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="pr-4 pb-1 font-medium">State</th>
                <th className="pr-4 pb-1 font-medium">Meaning</th>
                <th className="pb-1 font-medium">Next</th>
              </tr>
            </thead>
            <tbody>
              <Row
                state="frozen"
                meaning="Initial. No check has been sent. Waiting for an unfrozen pair with the same foundation to finish."
                next="waiting"
              />
              <Row
                state="waiting"
                meaning="Ready to check. The pacer will dispatch when Ta fires."
                next="in-progress"
              />
              <Row
                state="in-progress"
                meaning="STUN binding request sent. Awaiting response within RTO."
                next="succeeded, failed"
              />
              <Row
                state="succeeded"
                meaning="Response received. Pair is usable for data."
                next="(nominated)"
              />
              <Row
                state="failed"
                meaning="No response after retries, or rejected (e.g., bad credentials)."
                next="—"
              />
            </tbody>
          </table>
        </div>

        <Callout color="amber">
          <strong>Peer-reflexive (prflx) candidates</strong> are discovered
          here. If a check arrives from a source address that the receiver
          doesn't have in its candidate list (because the source NAT remapped
          mid-flight), the receiver synthesizes a new prflx candidate on the
          fly and forms a new pair with it. This is how ICE recovers when
          STUN's view of the NAT mapping was incomplete.
        </Callout>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          5. Nomination — pick the winner
        </h2>
        <p className="text-slate-700 mb-3">
          The controlling agent (one peer is designated controlling, by{" "}
          <code className="bg-slate-100 px-1">ice-controlling</code> vs{" "}
          <code className="bg-slate-100 px-1">ice-controlled</code> tie-break)
          picks the best succeeded pair and sends another check with the{" "}
          <code className="bg-slate-100 px-1">USE-CANDIDATE</code> attribute
          set. The receiving peer marks that pair nominated. After a final
          reciprocal exchange, the pair becomes the{" "}
          <em>selected pair</em>. All subsequent data flows over it.
        </p>
        <p className="text-slate-700">
          Modern WebRTC uses aggressive nomination by default — the controlling
          agent puts <code className="bg-slate-100 px-1">USE-CANDIDATE</code>{" "}
          on every check, so the highest-priority pair that succeeds first
          wins automatically. Regular nomination (wait for all checks, then
          pick) is supported but rare.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          6. Consent freshness — keep the path alive
        </h2>
        <p className="text-slate-700">
          After connection, both peers send a STUN binding request on the
          selected pair every ~15 seconds (RFC 7675). If 30 seconds pass
          without a response, the pair is marked failed and ICE restarts. This
          is also how WebRTC detects network changes (Wi-Fi → cellular).
        </p>
      </section>

      <hr className="border-slate-200" />

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          Live algorithm simulator
        </h2>
        <p className="text-slate-600 mb-6 max-w-3xl">
          Press play. Watch candidates get gathered, pairs get formed, checks
          fire, and one pair get nominated. Switch scenarios to see how the
          same algorithm produces different outcomes on different networks —
          including the exact failure mode that broke your cross-device test
          (try <strong>"Same NAT, no hairpin"</strong>).
        </p>
        <IceSimulator />
      </section>
    </div>
  );
}

function Formula({
  title,
  formula,
  notes,
}: {
  title: string;
  formula: string;
  notes: string[];
}) {
  return (
    <div className="border border-slate-200 bg-slate-50 rounded-md p-4 mb-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-2">
        {title}
      </div>
      <div className="font-mono text-sm text-slate-900 mb-3">{formula}</div>
      <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
        {notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

function Callout({
  color,
  children,
}: {
  color: "amber" | "slate" | "blue";
  children: React.ReactNode;
}) {
  const map = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
  };
  return (
    <div className={`text-sm border rounded-md p-3 ${map[color]}`}>
      {children}
    </div>
  );
}

function PairBadge({ state }: { state: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] border bg-slate-100 text-slate-700 border-slate-200 font-medium font-mono">
      {state}
    </span>
  );
}

function Row({
  state,
  meaning,
  next,
}: {
  state: string;
  meaning: string;
  next: string;
}) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-4 align-top">
        <PairBadge state={state} />
      </td>
      <td className="py-2 pr-4 align-top text-slate-700 max-w-md">
        {meaning}
      </td>
      <td className="py-2 align-top text-xs text-slate-500 font-mono whitespace-nowrap">
        → {next}
      </td>
    </tr>
  );
}
