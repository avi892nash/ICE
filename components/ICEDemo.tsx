"use client";

import { useEffect, useRef, useState } from "react";
import {
  createPeerConnection,
  DEFAULT_ICE_SERVERS,
  decodeSignal,
  encodeSignal,
  getSelectedCandidatePair,
  OPEN_RELAY_TURN_SERVERS,
  PUBLIC_STUN_SERVERS,
  type SelectedPair,
} from "@/lib/webrtc";
import { CandidateBadge } from "./CandidateBadge";
import { CandidateList } from "./CandidateList";

type Role = "offerer" | "answerer" | null;
type ConnState = RTCPeerConnectionState;

export function ICEDemo() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const [role, setRole] = useState<Role>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [gatheringState, setGatheringState] =
    useState<RTCIceGatheringState>("new");
  const [connState, setConnState] = useState<ConnState>("new");
  const [iceState, setIceState] = useState<RTCIceConnectionState>("new");

  const [localSdp, setLocalSdp] = useState("");
  const [remoteSdp, setRemoteSdp] = useState("");
  const [messages, setMessages] = useState<
    { from: "me" | "peer"; text: string; t: number }[]
  >([]);
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [useTurn, setUseTurn] = useState(true);
  const [customTurnUrl, setCustomTurnUrl] = useState("");
  const [customTurnUser, setCustomTurnUser] = useState("");
  const [customTurnCred, setCustomTurnCred] = useState("");
  const [selectedPair, setSelectedPair] = useState<SelectedPair | null>(null);

  function addLog(line: string) {
    setLog((l) => [
      `${new Date().toLocaleTimeString()} ${line}`,
      ...l.slice(0, 50),
    ]);
  }

  function setupConnection() {
    const iceServers: RTCIceServer[] = [...PUBLIC_STUN_SERVERS];
    if (useTurn) iceServers.push(...OPEN_RELAY_TURN_SERVERS);
    if (customTurnUrl.trim()) {
      iceServers.push({
        urls: customTurnUrl.trim(),
        username: customTurnUser.trim() || undefined,
        credential: customTurnCred.trim() || undefined,
      });
    }
    const pc = createPeerConnection(iceServers);
    pcRef.current = pc;
    setCandidates([]);
    setSelectedPair(null);
    setGatheringState(pc.iceGatheringState);
    setConnState(pc.connectionState);
    setIceState(pc.iceConnectionState);
    addLog(`ice servers: ${iceServers.length} (turn ${useTurn ? "on" : "off"})`);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        setCandidates((c) => [...c, e.candidate!.candidate]);
        addLog(`new candidate: ${e.candidate.candidate.slice(0, 60)}...`);
      }
    };
    pc.onicegatheringstatechange = () => {
      setGatheringState(pc.iceGatheringState);
      addLog(`gathering: ${pc.iceGatheringState}`);
    };
    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState);
      addLog(`ice: ${pc.iceConnectionState}`);
    };
    pc.onconnectionstatechange = () => {
      setConnState(pc.connectionState);
      addLog(`peer: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        void refreshSelectedPair();
      }
    };
    pc.ondatachannel = (e) => {
      attachDataChannel(e.channel);
    };

    return pc;
  }

  async function refreshSelectedPair() {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const pair = await getSelectedCandidatePair(pc);
      if (pair) setSelectedPair(pair);
    } catch {
      // ignore
    }
  }

  function attachDataChannel(dc: RTCDataChannel) {
    dcRef.current = dc;
    dc.onopen = () => addLog(`data channel open: ${dc.label}`);
    dc.onclose = () => addLog(`data channel closed: ${dc.label}`);
    dc.onmessage = (e) =>
      setMessages((m) => [
        ...m,
        { from: "peer", text: String(e.data), t: Date.now() },
      ]);
  }

  async function startAsOfferer() {
    const pc = setupConnection();
    setRole("offerer");
    const dc = pc.createDataChannel("chat");
    attachDataChannel(dc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    addLog("offer created, waiting for ICE gathering");
    await waitForGatheringComplete(pc);
    const finalOffer = pc.localDescription!;
    setLocalSdp(
      encodeSignal({ type: "offer", sdp: finalOffer.sdp ?? "" }),
    );
    addLog("offer ready to share");
  }

  async function acceptOffer() {
    if (!remoteSdp.trim()) return;
    const pc = setupConnection();
    setRole("answerer");
    let payload;
    try {
      payload = decodeSignal(remoteSdp);
    } catch {
      addLog("failed to decode offer");
      return;
    }
    await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForGatheringComplete(pc);
    setLocalSdp(
      encodeSignal({ type: "answer", sdp: pc.localDescription!.sdp ?? "" }),
    );
    addLog("answer ready to share");
  }

  async function applyAnswer() {
    const pc = pcRef.current;
    if (!pc || !remoteSdp.trim()) return;
    try {
      const payload = decodeSignal(remoteSdp);
      await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
      addLog("answer applied — connectivity checks begin");
    } catch {
      addLog("failed to apply answer");
    }
  }

  function sendMessage() {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open" || !draft.trim()) return;
    dc.send(draft);
    setMessages((m) => [...m, { from: "me", text: draft, t: Date.now() }]);
    setDraft("");
  }

  function reset() {
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    setRole(null);
    setCandidates([]);
    setLocalSdp("");
    setRemoteSdp("");
    setMessages([]);
    setGatheringState("new");
    setConnState("new");
    setIceState("new");
    addLog("reset");
  }

  useEffect(() => {
    return () => {
      pcRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (connState !== "connected") return;
    const id = setInterval(refreshSelectedPair, 2000);
    return () => clearInterval(id);
  }, [connState]);

  return (
    <div className="space-y-6">
      <StateBar
        role={role}
        gatheringState={gatheringState}
        iceState={iceState}
        connState={connState}
      />

      {role === null && (
        <>
          <IceConfigPanel
            useTurn={useTurn}
            setUseTurn={setUseTurn}
            customTurnUrl={customTurnUrl}
            setCustomTurnUrl={setCustomTurnUrl}
            customTurnUser={customTurnUser}
            setCustomTurnUser={setCustomTurnUser}
            customTurnCred={customTurnCred}
            setCustomTurnCred={setCustomTurnCred}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <RoleCard
              title="Peer A (Offerer)"
              description="Start here on one tab. Creates an offer SDP — copy it to Peer B."
              buttonLabel="Create offer"
              onClick={startAsOfferer}
            />
            <RoleCard
              title="Peer B (Answerer)"
              description="Open this in another tab or device. Paste the offer to generate an answer."
              buttonLabel="I have an offer"
              onClick={() => setRole("answerer")}
            />
          </div>
        </>
      )}

      {role !== null && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SignalingPanel
              role={role}
              localSdp={localSdp}
              remoteSdp={remoteSdp}
              setRemoteSdp={setRemoteSdp}
              acceptOffer={acceptOffer}
              applyAnswer={applyAnswer}
            />

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Local ICE candidates ({candidates.length})
              </h3>
              <CandidateList candidates={candidates} />
            </div>
          </div>

          <div className="space-y-4">
            <ChatPanel
              connected={connState === "connected"}
              messages={messages}
              draft={draft}
              setDraft={setDraft}
              onSend={sendMessage}
            />

            <SelectedPairCard
              pair={selectedPair}
              iceState={iceState}
              useTurn={useTurn}
            />

            <EventLog log={log} />
          </div>
        </div>
      )}

      {role !== null && (
        <button
          onClick={reset}
          className="text-sm text-slate-500 hover:text-slate-900 underline"
        >
          Reset demo
        </button>
      )}
    </div>
  );
}

function waitForGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    // TURN allocation can take a few seconds. Cap at 12s to avoid hanging.
    setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    }, 12000);
  });
}

function StateBar({
  role,
  gatheringState,
  iceState,
  connState,
}: {
  role: Role;
  gatheringState: RTCIceGatheringState;
  iceState: RTCIceConnectionState;
  connState: ConnState;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
      <StateChip label="Role" value={role ?? "—"} />
      <StateChip label="Gathering" value={gatheringState} />
      <StateChip label="ICE" value={iceState} accent={iceState} />
      <StateChip label="Peer" value={connState} accent={connState} />
    </div>
  );
}

function StateChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const accentColor =
    accent === "connected"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : accent === "failed" || accent === "disconnected" || accent === "closed"
        ? "bg-rose-50 border-rose-200 text-rose-800"
        : accent === "checking" || accent === "connecting"
          ? "bg-amber-50 border-amber-200 text-amber-800"
          : "bg-white border-slate-200 text-slate-700";
  return (
    <div className={`border rounded-md px-3 py-2 ${accentColor}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="font-mono">{value}</div>
    </div>
  );
}

function RoleCard({
  title,
  description,
  buttonLabel,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-5 bg-white">
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-4">{description}</p>
      <button
        onClick={onClick}
        className="px-3 py-1.5 text-sm bg-ice-600 text-white rounded-md hover:bg-ice-700"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function SignalingPanel({
  role,
  localSdp,
  remoteSdp,
  setRemoteSdp,
  acceptOffer,
  applyAnswer,
}: {
  role: Role;
  localSdp: string;
  remoteSdp: string;
  setRemoteSdp: (s: string) => void;
  acceptOffer: () => void;
  applyAnswer: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">
        Signaling (copy-paste)
      </h3>

      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Your {role === "offerer" ? "offer" : "answer"} — send this to the
          other peer
        </label>
        <textarea
          readOnly
          value={localSdp}
          className="w-full h-24 text-xs font-mono border border-slate-200 rounded-md p-2 bg-slate-50"
          placeholder="Will appear after ICE gathering..."
        />
        {localSdp && (
          <button
            onClick={() => navigator.clipboard.writeText(localSdp)}
            className="mt-1 text-xs text-ice-600 hover:underline"
          >
            Copy
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Paste the {role === "offerer" ? "answer" : "offer"} from the other
          peer
        </label>
        <textarea
          value={remoteSdp}
          onChange={(e) => setRemoteSdp(e.target.value)}
          className="w-full h-24 text-xs font-mono border border-slate-200 rounded-md p-2"
          placeholder="Paste here..."
        />
        <button
          onClick={role === "offerer" ? applyAnswer : acceptOffer}
          disabled={!remoteSdp.trim()}
          className="mt-1 px-3 py-1 text-xs bg-slate-900 text-white rounded-md disabled:opacity-40"
        >
          {role === "offerer" ? "Apply answer" : "Generate answer"}
        </button>
      </div>
    </div>
  );
}

function ChatPanel({
  connected,
  messages,
  draft,
  setDraft,
  onSend,
}: {
  connected: boolean;
  messages: { from: "me" | "peer"; text: string; t: number }[];
  draft: string;
  setDraft: (s: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Data channel chat
      </h3>
      <div className="h-40 overflow-y-auto bg-slate-50 rounded-md p-2 space-y-1 mb-2">
        {messages.length === 0 && (
          <div className="text-xs text-slate-400 italic text-center py-8">
            {connected
              ? "Connected — say hello!"
              : "Messages appear here once the peer connection is open"}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-xs ${m.from === "me" ? "text-right" : "text-left"}`}
          >
            <span
              className={`inline-block px-2 py-1 rounded ${
                m.from === "me"
                  ? "bg-ice-600 text-white"
                  : "bg-white border border-slate-200 text-slate-800"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          disabled={!connected}
          className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1 disabled:bg-slate-50"
          placeholder={connected ? "Type a message..." : "Not connected"}
        />
        <button
          onClick={onSend}
          disabled={!connected || !draft.trim()}
          className="px-3 py-1 text-sm bg-ice-600 text-white rounded-md disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function IceConfigPanel({
  useTurn,
  setUseTurn,
  customTurnUrl,
  setCustomTurnUrl,
  customTurnUser,
  setCustomTurnUser,
  customTurnCred,
  setCustomTurnCred,
}: {
  useTurn: boolean;
  setUseTurn: (v: boolean) => void;
  customTurnUrl: string;
  setCustomTurnUrl: (v: string) => void;
  customTurnUser: string;
  setCustomTurnUser: (v: string) => void;
  customTurnCred: string;
  setCustomTurnCred: (v: string) => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            ICE servers
          </h3>
          <p className="text-xs text-slate-600">
            STUN reveals your public IP. TURN relays traffic when direct paths
            fail — needed when both peers share a NAT that doesn't support
            hairpin, or across symmetric NATs.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs whitespace-nowrap cursor-pointer">
          <input
            type="checkbox"
            checked={useTurn}
            onChange={(e) => setUseTurn(e.target.checked)}
            className="w-4 h-4 accent-ice-600"
          />
          <span className="font-medium text-slate-700">
            Use free TURN (Open Relay)
          </span>
        </label>
      </div>

      <details className="border-t border-slate-100 pt-3">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
          Add your own TURN server (recommended — public TURN is flaky)
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
          <input
            type="text"
            value={customTurnUrl}
            onChange={(e) => setCustomTurnUrl(e.target.value)}
            placeholder="turn:turn.example.com:3478"
            className="border border-slate-200 rounded-md px-2 py-1.5 font-mono"
          />
          <input
            type="text"
            value={customTurnUser}
            onChange={(e) => setCustomTurnUser(e.target.value)}
            placeholder="username"
            className="border border-slate-200 rounded-md px-2 py-1.5 font-mono"
          />
          <input
            type="text"
            value={customTurnCred}
            onChange={(e) => setCustomTurnCred(e.target.value)}
            placeholder="credential"
            className="border border-slate-200 rounded-md px-2 py-1.5 font-mono"
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Get free credentials from{" "}
          <a
            href="https://www.metered.ca/tools/openrelay/"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            metered.ca
          </a>{" "}
          or{" "}
          <a
            href="https://www.twilio.com/docs/stun-turn"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Twilio NTS
          </a>
          . Applies on the next "Create offer" / "Generate answer".
        </p>
      </details>
    </div>
  );
}

function SelectedPairCard({
  pair,
  iceState,
  useTurn,
}: {
  pair: SelectedPair | null;
  iceState: RTCIceConnectionState;
  useTurn: boolean;
}) {
  const isFailed = iceState === "failed" || iceState === "disconnected";

  if (isFailed) {
    return (
      <div className="border border-rose-200 bg-rose-50 rounded-lg p-4 text-sm text-rose-900">
        <h3 className="font-semibold mb-1">Connection failed</h3>
        <p className="mb-2">
          ICE could not find a working path between the peers. Common causes:
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>
            Both peers behind the same NAT that doesn't hairpin{" "}
            {useTurn ? "(should be solved by TURN)" : "— try enabling TURN"}
          </li>
          <li>
            Chrome's mDNS host candidates can't resolve across devices on HTTP
          </li>
          <li>One or both peers behind symmetric NAT (CGNAT, enterprise FW)</li>
          <li>STUN/TURN server unreachable</li>
        </ul>
      </div>
    );
  }

  if (!pair) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Selected candidate pair
        </h3>
        <p className="text-xs text-slate-500 italic">
          Will appear once connectivity checks succeed.
        </p>
      </div>
    );
  }

  const isRelay =
    pair.local?.type === "relay" || pair.remote?.type === "relay";

  return (
    <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-emerald-900">
          Selected candidate pair
        </h3>
        {isRelay && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-medium">
            Relayed via TURN
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white rounded-md p-2 border border-slate-200">
          <div className="text-[10px] uppercase text-slate-500 mb-1">Local</div>
          {pair.local && (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <CandidateBadge type={pair.local.type} />
              </div>
              <div className="font-mono text-slate-700">
                {pair.local.address}:{pair.local.port}
              </div>
              <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                {pair.local.protocol}
              </div>
            </>
          )}
        </div>
        <div className="bg-white rounded-md p-2 border border-slate-200">
          <div className="text-[10px] uppercase text-slate-500 mb-1">
            Remote
          </div>
          {pair.remote && (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <CandidateBadge type={pair.remote.type} />
              </div>
              <div className="font-mono text-slate-700">
                {pair.remote.address}:{pair.remote.port}
              </div>
              <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                {pair.remote.protocol}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
        <span>↑ {pair.bytesSent} B</span>
        <span>↓ {pair.bytesReceived} B</span>
      </div>
    </div>
  );
}

function EventLog({ log }: { log: string[] }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">Event log</h3>
      <div className="h-32 overflow-y-auto code-block">
        {log.length === 0 ? (
          <div className="text-slate-500 italic">No events yet</div>
        ) : (
          log.map((l, i) => <div key={i}>{l}</div>)
        )}
      </div>
    </div>
  );
}
