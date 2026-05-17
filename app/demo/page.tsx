import { ICEDemo } from "@/components/ICEDemo";

export const metadata = {
  title: "Live ICE Demo",
};

export default function DemoPage() {
  return (
    <div className="space-y-8">
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

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        <strong>Heads up:</strong> Signaling here is copy-paste. In a real app
        this would happen over WebSocket. The demo also uses only public STUN
        servers — no TURN — so connections may fail across symmetric NATs.
        That's exactly the point of the{" "}
        <a href="/limitations" className="underline">
          limitations page
        </a>
        .
      </div>

      <ICEDemo />
    </div>
  );
}
