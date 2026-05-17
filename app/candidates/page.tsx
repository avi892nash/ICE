import { CandidateExplorer } from "@/components/CandidateExplorer";

export const metadata = {
  title: "ICE Candidate Explorer",
};

export default function CandidatesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Candidate explorer
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Click "Gather candidates" to run ICE gathering against public STUN
          servers. Each candidate is parsed so you can see foundation,
          priority, transport, and the candidate type.
        </p>
      </div>

      <CandidateExplorer />

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          What the fields mean
        </h2>
        <dl className="text-sm space-y-3 max-w-2xl">
          <Item term="Foundation">
            A short identifier that's shared across candidates from the same
            interface. Used to deduplicate during pair pruning.
          </Item>
          <Item term="Component">
            <code className="bg-slate-100 px-1">1</code> = RTP,{" "}
            <code className="bg-slate-100 px-1">2</code> = RTCP. Data channels
            and bundled streams use component 1.
          </Item>
          <Item term="Priority">
            A 32-bit number combining type preference, local preference, and
            component. Higher = checked sooner.
          </Item>
          <Item term="Related address (raddr/rport)">
            For srflx and relay candidates, this is the base address the
            candidate maps from — useful for debugging NAT behavior.
          </Item>
        </dl>
      </section>
    </div>
  );
}

function Item({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-semibold text-slate-900">{term}</dt>
      <dd className="text-slate-600">{children}</dd>
    </div>
  );
}
