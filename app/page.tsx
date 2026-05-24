import type { Metadata } from "next";
import Link from "next/link";
import { buildLearningResource, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "ICE Demo — Interactive Connectivity Establishment for WebRTC",
  },
  description:
    "An interactive, self-paced tutorial on WebRTC's ICE protocol (RFC 8445): the 4-stage pipeline (gathering, signaling, checks, nomination), the candidate types (host, srflx, prflx, relay), and where the algorithm fails in production.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "ICE Demo — Interactive WebRTC ICE tutorial",
    description:
      "Learn how WebRTC's ICE protocol finds a path between peers, with a live demo, candidate explorer, algorithm simulator, and a candid look at why it fails ~10–15% of the time.",
    url: "/",
  },
};

const homePageJsonLd = buildLearningResource({
  path: "/",
  name: "ICE Overview — the four-stage pipeline and candidate types",
  description:
    "Entry point for a self-paced WebRTC ICE tutorial. Introduces the 4-stage pipeline (gathering, signaling, connectivity checks, nomination) and the four candidate types (host, srflx, prflx, relay), and links to the interactive demos and algorithm simulator.",
  learningResourceType: ["Overview", "Tutorial"],
  teaches: [
    "WebRTC ICE protocol (RFC 8445)",
    "ICE 4-stage pipeline",
    "ICE candidate types: host, srflx, prflx, relay",
    "Why peer-to-peer connections need NAT traversal",
  ],
  timeRequired: "PT5M",
  interactivityType: "expositive",
  educationalLevel: "beginner",
});

export default function HomePage() {
  return (
    <div className="space-y-12">
      <JsonLdScript id="ld-json-page" data={homePageJsonLd} />
      <section>
        <div className="inline-block px-3 py-1 rounded-full bg-ice-100 text-ice-800 text-xs font-medium mb-4">
          RFC 8445 · WebRTC
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          How ICE establishes a peer-to-peer connection
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          ICE (Interactive Connectivity Establishment) is the protocol WebRTC
          uses to find a network path between two peers — even when they sit
          behind firewalls, NATs, and hostile networks. This demo shows the
          mechanics step by step.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/demo"
            className="px-4 py-2 rounded-md bg-ice-600 text-white text-sm font-medium hover:bg-ice-700"
          >
            Try the live demo →
          </Link>
          <Link
            href="/limitations"
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Read the limitations
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          The four-stage ICE pipeline
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Stage
            n={1}
            title="Gathering"
            body="Each peer collects candidate addresses: local IPs (host), public IPs via STUN (srflx), and relay addresses via TURN (relay)."
          />
          <Stage
            n={2}
            title="Signaling"
            body="Peers exchange their SDP (with candidates) through an out-of-band channel — typically a WebSocket server, but ICE doesn't define this."
          />
          <Stage
            n={3}
            title="Connectivity checks"
            body="Each peer pairs every local candidate with every remote candidate and runs STUN binding requests to find pairs that actually work."
          />
          <Stage
            n={4}
            title="Nomination"
            body="The controlling peer picks the best working pair (by priority) and nominates it. Data flow begins on that pair."
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          Candidate types you'll see
        </h2>
        <div className="space-y-2 text-sm">
          <Row
            label="host"
            color="bg-emerald-100 text-emerald-800"
            text="A local IP — works if peers share a LAN."
          />
          <Row
            label="srflx"
            color="bg-blue-100 text-blue-800"
            text="Server reflexive — your public IP discovered via STUN."
          />
          <Row
            label="prflx"
            color="bg-purple-100 text-purple-800"
            text="Peer reflexive — discovered mid-handshake during checks."
          />
          <Row
            label="relay"
            color="bg-amber-100 text-amber-800"
            text="A TURN relay — used when direct paths are blocked."
          />
        </div>
      </section>

      <section className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">
          What's in this demo
        </h3>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>
            <Link href="/algorithm" className="text-ice-600 hover:underline">
              Algorithm walkthrough + simulator
            </Link>{" "}
            — the full pipeline with formulas, plus a step-through animation
            of how ICE plays out on 4 different network topologies.
          </li>
          <li>
            <Link href="/demo" className="text-ice-600 hover:underline">
              Live two-peer demo
            </Link>{" "}
            — copy-paste signaling, watch candidates form, send chat over a
            data channel.
          </li>
          <li>
            <Link href="/candidates" className="text-ice-600 hover:underline">
              Candidate explorer
            </Link>{" "}
            — gather candidates from your browser and inspect each field.
          </li>
          <li>
            <Link href="/limitations" className="text-ice-600 hover:underline">
              Limitations
            </Link>{" "}
            — why ICE fails ~10–15% of the time and what TURN actually costs.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Stage({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-5 bg-white">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-7 h-7 rounded-full bg-ice-100 text-ice-700 flex items-center justify-center text-xs font-bold">
          {n}
        </div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-600">{body}</p>
    </div>
  );
}

function Row({
  label,
  color,
  text,
}: {
  label: string;
  color: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`candidate-badge ${color} w-20 justify-center`}>
        {label}
      </span>
      <span className="text-slate-700">{text}</span>
    </div>
  );
}
