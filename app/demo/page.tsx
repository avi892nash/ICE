import type { Metadata } from "next";
import { ICEDemo } from "@/components/ICEDemo";
import {
  buildBreadcrumbs,
  buildLearningResource,
  JsonLdScript,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Live two-peer demo",
  description:
    "Establish a real WebRTC peer-to-peer connection between two browser tabs using copy-paste signaling. Watch ICE candidates appear in real time, inspect the selected pair, and chat over a data channel.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Live WebRTC two-peer demo",
    description:
      "Open the page in two tabs, copy-paste the SDP, and watch ICE find a working path. Includes free TURN fallback and a selected-candidate-pair diagnostic.",
    url: "/demo",
  },
};

const learningResource = buildLearningResource({
  path: "/demo",
  name: "Live WebRTC two-peer ICE demo",
  description:
    "Hands-on lab: open two browser tabs, exchange SDP offer/answer via copy-paste, watch ICE candidates arrive in real time, then chat over a WebRTC data channel. Includes a free TURN fallback so the demo works even through symmetric NAT.",
  learningResourceType: ["Interactive Resource", "Demonstration"],
  teaches: [
    "WebRTC SDP offer/answer exchange",
    "Out-of-band signaling (copy-paste, WebSocket equivalents)",
    "Reading the selected candidate pair and ICE connection state",
    "WebRTC data channels for arbitrary peer-to-peer messages",
    "When TURN relay is needed and how it shows up in the pair list",
  ],
  timeRequired: "PT10M",
  interactivityType: "active",
  educationalLevel: "intermediate",
});

const breadcrumbs = buildBreadcrumbs([
  { name: "Overview", path: "/" },
  { name: "Live two-peer demo", path: "/demo" },
]);

export default function DemoPage() {
  return (
    <div className="space-y-8">
      <JsonLdScript id="ld-json-page" data={learningResource} />
      <JsonLdScript id="ld-json-breadcrumbs" data={breadcrumbs} />
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Live ICE demo
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Open this page in two tabs (or two browsers on different networks).
          One tab creates an offer, the other answers. You'll see ICE
          candidates appear in real time, and once connectivity checks succeed
          you can send messages over the data channel.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 space-y-2">
        <p>
          <strong>Heads up:</strong> Signaling is copy-paste (real apps use
          WebSocket). By default, this demo uses public Google STUN + a free
          public TURN server (Open Relay) so it works even when both peers
          share a NAT or one sits behind a symmetric NAT.
        </p>
        <p className="text-xs">
          <strong>Two devices on your LAN not connecting?</strong> That's
          usually mDNS host candidates not resolving across devices over HTTP
          plus your router not supporting hairpin NAT. Keep TURN enabled — the
          selected pair will show as <code>relay</code>.
        </p>
      </div>

      <ICEDemo />
    </div>
  );
}
