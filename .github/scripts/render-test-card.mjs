// Build an HTML "results card" from a Vitest JSON report, plus the pixel
// height to screenshot it at. CI renders the HTML to PNG with headless Chrome
// and uploads it as the `test-results-card` artifact — see ci.yml (unit-tests).
//
// Usage: node .github/scripts/render-test-card.mjs [results.json]
// Writes: test-card.html, test-card-height.txt (next to cwd).
import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

const RESULTS = process.argv[2] ?? "test-results.json";
const report = JSON.parse(readFileSync(RESULTS, "utf8"));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let vitestVersion = "";
try {
  vitestVersion = JSON.parse(
    readFileSync("node_modules/vitest/package.json", "utf8"),
  ).version;
} catch {
  /* not fatal — version is cosmetic */
}

const files = (report.testResults ?? []).map((t) => ({
  name: relative(process.cwd(), t.name),
  count: (t.assertionResults ?? []).length,
  passed: t.status === "passed",
  ms: Math.max(0, Math.round((t.endTime ?? 0) - (t.startTime ?? 0))),
}));

const passed = report.numPassedTests ?? 0;
const failed = report.numFailedTests ?? 0;
const total = report.numTotalTests ?? passed + failed;
const ok = (report.success ?? failed === 0) && failed === 0;
const endMax = Math.max(...files.map((f) => f.ms), 0);
const durMs = Math.max(
  endMax,
  ...(report.testResults ?? []).map((t) =>
    Math.round((t.endTime ?? 0) - (report.startTime ?? t.startTime ?? 0)),
  ),
  0,
);

// --- terminal body (monospace, column-aligned) ---
const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));
const nameW = Math.max(20, ...files.map((f) => f.name.length)) + 2;
const fileLines = files
  .map((f) => {
    const mark = f.passed
      ? '<span class="ok">✓</span>'
      : '<span class="bad">✗</span>';
    return `  ${mark} ${esc(pad(f.name, nameW))}<span class="dim">(<span class="num">${f.count}</span> tests)</span>  ${f.ms}ms`;
  })
  .join("\n");

const filesPassed = files.filter((f) => f.passed).length;
const summary =
  `  Test Files   <span class="${ok ? "ok" : "bad"}">${filesPassed} ${ok ? "passed" : "of " + files.length}</span> <span class="dim">(${files.length})</span>\n` +
  `       Tests   ${failed ? `<span class="bad">${failed} failed</span> | ` : ""}<span class="ok">${passed} passed</span> <span class="dim">(${total})</span>\n` +
  `    Duration   ${durMs}ms`;

// --- CI provenance (best-effort; cosmetic) ---
const sha = (process.env.GITHUB_SHA ?? "").slice(0, 7);
const runNo = process.env.GITHUB_RUN_NUMBER ?? "";
const branch = process.env.GITHUB_REF_NAME ?? "";
const repo = process.env.GITHUB_REPOSITORY ?? "";
const subParts = [];
if (repo && sha) subParts.push(`${esc(repo)}@${esc(sha)}`);
if (runNo) subParts.push(`run #${esc(runNo)}`);
if (branch) subParts.push(esc(branch));
const sub = subParts.length
  ? `Generated on GitHub Actions · ${subParts.join(" · ")}`
  : "Generated from <b>npm&nbsp;test</b> (local)";

const badge = ok
  ? `<span class="badge ok-bg">${total} PASSED</span>`
  : `<span class="badge bad-bg">${failed} FAILED</span>`;

// --- pixel height: deterministic because line-height is fixed at 1.7 ---
const preLines = files.length + 6; // RUN + blank + files + blank + 3 summary
const height = Math.ceil(308 + preLines * 31 + 34);

const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { background:#0d1117; width:1180px; height:${height}px; overflow:hidden; }
  body { font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; color:#c9d1d9; padding:42px 48px; }
  .page { width:1084px; }
  .head { display:flex; align-items:center; gap:14px; margin-bottom:8px; }
  .head h1 { font-size:31px; font-weight:700; color:#f0f6fc; letter-spacing:-0.5px; }
  .badge { font-size:13px; font-weight:700; color:#0d1117; padding:4px 12px; border-radius:20px; }
  .ok-bg { background:#3fb950; } .bad-bg { background:#f85149; color:#fff; }
  .sub { font-size:15px; color:#8b949e; margin-bottom:24px; } .sub b { color:#c9d1d9; font-weight:600; }
  .term { background:#010409; border:1px solid #30363d; border-radius:12px; overflow:hidden; margin-bottom:22px; }
  .term .bar { background:#161b22; padding:11px 16px; display:flex; align-items:center; gap:8px; border-bottom:1px solid #30363d; }
  .dot { width:12px; height:12px; border-radius:50%; }
  .r{background:#ff5f56;} .y{background:#ffbd2e;} .g{background:#27c93f;}
  .term .bar span { margin-left:10px; font-size:13px; color:#8b949e; font-family:ui-monospace,"SF Mono",Menlo,"DejaVu Sans Mono",monospace; }
  .term pre { padding:20px 22px; font-family:ui-monospace,"SF Mono",Menlo,"DejaVu Sans Mono",Consolas,monospace; font-size:18px; line-height:1.7; color:#c9d1d9; white-space:pre-wrap; }
  .ok{color:#3fb950; font-weight:700;} .bad{color:#f85149; font-weight:700;} .dim{color:#8b949e;} .num{color:#58a6ff; font-weight:700;}
  .foot { font-size:13px; color:#6e7681; } .foot code { color:#8b949e; font-family:ui-monospace,Menlo,monospace; }
</style></head><body><div class="page">
  <div class="head"><h1>ICE — Unit test suite</h1>${badge}</div>
  <div class="sub">${sub}</div>
  <div class="term">
    <div class="bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><span>vitest run${vitestVersion ? " · v" + esc(vitestVersion) : ""}</span></div>
<pre>  <span class="${ok ? "ok" : "bad"}">RUN</span>

${fileLines}

${summary}</pre>
  </div>
  <div class="foot">Rendered by <code>.github/scripts/render-test-card.mjs</code> and uploaded as the <code>test-results-card</code> artifact.</div>
</div></body></html>`;

writeFileSync("test-card.html", html);
writeFileSync("test-card-height.txt", String(height));
console.log(
  `card: ${total} tests, ${failed} failed, ${files.length} files → ${height}px`,
);
