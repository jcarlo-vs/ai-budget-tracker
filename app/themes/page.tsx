import { Fragment } from "react";
import type { CSSProperties } from "react";
import { formatCentavos } from "@/lib/money";

/* ───────────────────────────────────────────────────────────────────────────
   /themes — a static, scrollable design-preview gallery.
   Each section renders a full mobile "Home" dashboard for one design direction,
   using the SAME sample data. Every mockup is fully self-contained: its own
   background, fonts, colours and surfaces via a scoped <style> with a unique
   class prefix. It does NOT use the app's global Dark-Glass tokens/.surface.
   Server component — no "use client", no data fetching, pure markup.
   ─────────────────────────────────────────────────────────────────────────── */

const fmt = (centavos: number) => formatCentavos(centavos);

const SPENT = 2_125_000; //  ₱21,250.00
const SPENT_PCT = 13;

const STATS = [
  { label: "Budget", value: 15_880_000, dot: "#10b981" },
  { label: "Allocated", value: 7_635_000, dot: "#6366f1" },
  { label: "Remaining", value: 13_755_000, dot: "#0ea5e9" },
];

type Cat = {
  emoji: string;
  name: string;
  spent: number;
  budget: number;
  pct: number;
  left: number;
  color: string;
};

const CATS: Cat[] = [
  { emoji: "🚗", name: "Car Loan", spent: 1_700_000, budget: 1_700_000, pct: 100, left: 0, color: "#60a5fa" },
  { emoji: "⛽", name: "Gas", spent: 250_000, budget: 250_000, pct: 100, left: 0, color: "#f59e0b" },
  { emoji: "🏠", name: "Rent", spent: 0, budget: 870_000, pct: 0, left: 870_000, color: "#34d399" },
  { emoji: "🛒", name: "Grocery", spent: 175_000, budget: 250_000, pct: 70, left: 75_000, color: "#f472b6" },
  { emoji: "🍜", name: "Food", spent: 120_000, budget: 400_000, pct: 30, left: 280_000, color: "#fb923c" },
];

/* ── shared primitives ─────────────────────────────────────────────────────── */

function Bar({
  pct,
  track,
  fill,
  h = 6,
  r = 999,
}: {
  pct: number;
  track: string;
  fill: string;
  h?: number;
  r?: number;
}) {
  return (
    <div style={{ height: h, background: track, borderRadius: r, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: fill, borderRadius: r }} />
    </div>
  );
}

type SvgP = { s?: number; w?: number };

function HomeIcon({ s = 23, w = 1.7 }: SvgP) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 10.5 9-7 9 7V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}
function SavingsIcon({ s = 23, w = 1.7 }: SvgP) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.6 3.1 3 7 3s7-1.4 7-3V6" />
      <path d="M5 12v6c0 1.6 3.1 3 7 3s7-1.4 7-3v-6" />
    </svg>
  );
}
function ManageIcon({ s = 23, w = 1.7 }: SvgP) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
function Chev({ left = false, s = 16, w = 2.1 }: { left?: boolean } & SvgP) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={left ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

function IosStatus({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 2px", color, fontSize: 14, fontWeight: 600 }}>
      <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-.02em" }}>9:41</span>
      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill={color} aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.7" y="5" width="3" height="6" rx="1" />
          <rect x="9.3" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="14" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 12" fill={color} aria-hidden>
          <path d="M8 2.4c2.6 0 5 1 6.8 2.7l-1.4 1.5A7.6 7.6 0 0 0 8 4.5 7.6 7.6 0 0 0 2.6 6.6L1.2 5.1A9.6 9.6 0 0 1 8 2.4Z" />
          <path d="M8 6.2c1.5 0 2.9.6 4 1.6l-1.5 1.5A3.6 3.6 0 0 0 8 8.2c-.9 0-1.8.4-2.5 1.1L4 7.8A5.6 5.6 0 0 1 8 6.2Z" />
          <circle cx="8" cy="10.4" r="1.4" />
        </svg>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <span style={{ width: 23, height: 12, border: `1px solid ${color}`, borderRadius: 3, padding: 1.5, display: "inline-flex", opacity: 0.9 }}>
            <span style={{ flex: 1, background: color, borderRadius: 1.5 }} />
          </span>
          <span style={{ width: 1.5, height: 4, background: color, borderRadius: 1, opacity: 0.55 }} />
        </span>
      </span>
    </div>
  );
}

/* ── 1 · Apple — Liquid Glass (Dark) ──────────────────────────────────────── */

const adCss = `
.ad-frame{position:relative;overflow:hidden;color:#f5f5f7;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  font-family:-apple-system,"SF Pro Display","SF Pro Text",system-ui,sans-serif;
  background:radial-gradient(118% 72% at 84% -8%,rgba(10,132,255,.32),transparent 56%),radial-gradient(110% 70% at -6% 6%,rgba(48,209,88,.18),transparent 54%),#000;}
.ad-pad{padding:14px 18px 0;}
.ad-month{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:10px;font-size:17px;font-weight:600;}
.ad-month .c{color:rgba(235,235,245,.5);display:flex;}
.ad-glass{background:rgba(255,255,255,.08);border:.5px solid rgba(255,255,255,.16);border-radius:22px;
  -webkit-backdrop-filter:blur(40px) saturate(180%);backdrop-filter:blur(40px) saturate(180%);
  box-shadow:inset 0 .5px 0 0 rgba(255,255,255,.22),0 18px 42px -24px rgba(0,0,0,.75);}
.ad-hero{margin-top:18px;padding:20px;}
.ad-l{font-size:13px;color:rgba(235,235,245,.6);font-weight:500;}
.ad-num{margin-top:5px;font-size:46px;line-height:1.02;font-weight:700;letter-spacing:-.025em;}
.ad-cap{margin-top:14px;font-size:12px;color:rgba(235,235,245,.55);}
.ad-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;}
.ad-stat{padding:12px 11px;}
.ad-sl{font-size:11px;color:rgba(235,235,245,.55);font-weight:500;}
.ad-sv{margin-top:4px;font-size:15px;font-weight:600;white-space:nowrap;letter-spacing:-.01em;}
.ad-sh{margin:22px 6px 10px;font-size:13px;font-weight:600;letter-spacing:.01em;color:rgba(235,235,245,.5);}
.ad-list{overflow:hidden;}
.ad-row{display:flex;gap:12px;padding:14px;align-items:flex-start;}
.ad-row + .ad-row{border-top:.5px solid rgba(255,255,255,.10);}
.ad-chip{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;font-size:19px;flex:none;}
.ad-body{flex:1;min-width:0;}
.ad-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline;}
.ad-name{font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ad-amt{font-size:12px;color:rgba(235,235,245,.6);white-space:nowrap;}
.ad-bar{margin-top:9px;}
.ad-left{margin-top:7px;font-size:12px;color:rgba(235,235,245,.5);}
.ad-tabs{margin-top:18px;display:flex;justify-content:space-around;padding:13px 8px 24px;border-top:.5px solid rgba(255,255,255,.1);
  background:rgba(22,22,24,.55);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);}
.ad-tab{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:500;color:rgba(235,235,245,.42);}
.ad-tab.on{color:#0a84ff;}
`;

function AppleDark() {
  return (
    <div className="ad-frame">
      <style>{adCss}</style>
      <div className="ad-pad">
        <IosStatus color="#f5f5f7" />
        <div className="ad-month">
          <span className="c"><Chev left /></span>
          <span>June 2026</span>
          <span className="c"><Chev /></span>
        </div>

        <div className="ad-glass ad-hero">
          <div className="ad-l">Spent in June 2026</div>
          <div className="ad-num">{fmt(SPENT)}</div>
          <div className="ad-cap" style={{ marginBottom: 8 }}>{SPENT_PCT}% of {fmt(15_880_000)} budget</div>
          <Bar pct={SPENT_PCT} track="rgba(255,255,255,.16)" fill="linear-gradient(90deg,#0a84ff,#30d158)" h={6} />
        </div>

        <div className="ad-stats">
          {STATS.map((s) => (
            <div className="ad-glass ad-stat" key={s.label}>
              <div className="ad-sl">{s.label}</div>
              <div className="ad-sv">{fmt(s.value)}</div>
            </div>
          ))}
        </div>

        <div className="ad-sh">Categories</div>
        <div className="ad-glass ad-list">
          {CATS.map((c) => (
            <div className="ad-row" key={c.name}>
              <div className="ad-chip">{c.emoji}</div>
              <div className="ad-body">
                <div className="ad-top">
                  <span className="ad-name">{c.name}</span>
                  <span className="ad-amt">{fmt(c.spent)} / {fmt(c.budget)}</span>
                </div>
                <div className="ad-bar">
                  <Bar pct={c.pct} track="rgba(255,255,255,.14)" fill={c.pct >= 100 ? "#30d158" : "#0a84ff"} h={5} />
                </div>
                <div className="ad-left">{fmt(c.left)} left</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ad-tabs">
        <div className="ad-tab on"><HomeIcon w={2} />Home</div>
        <div className="ad-tab"><SavingsIcon />Savings</div>
        <div className="ad-tab"><ManageIcon />Manage</div>
      </div>
    </div>
  );
}

/* ── 2 · Apple — Light (iOS grouped) ──────────────────────────────────────── */

const alCss = `
.al-frame{background:#f2f2f7;color:#1c1c1e;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;overflow:hidden;
  font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;}
.al-pad{padding:14px 16px 0;}
.al-month{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:10px;font-size:15px;font-weight:600;}
.al-month .c{color:#007aff;display:flex;}
.al-title{margin:12px 4px 12px;font-size:30px;font-weight:700;letter-spacing:-.02em;}
.al-card{background:#fff;border-radius:14px;overflow:hidden;}
.al-hero{padding:18px;}
.al-l{font-size:13px;color:rgba(60,60,67,.6);font-weight:500;}
.al-num{margin-top:4px;font-size:42px;font-weight:700;letter-spacing:-.025em;line-height:1.02;}
.al-cap{margin-top:14px;font-size:12px;color:rgba(60,60,67,.6);}
.al-sh{margin:24px 16px 7px;font-size:13px;color:rgba(60,60,67,.6);text-transform:uppercase;letter-spacing:.02em;}
.al-lr{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;font-size:16px;}
.al-lv{color:rgba(60,60,67,.6);white-space:nowrap;}
.al-hr{height:.5px;background:rgba(60,60,67,.18);border:0;display:block;}
.al-hr.text{margin-left:16px;}
.al-hr.inset{margin-left:62px;}
.al-cr{display:flex;gap:12px;padding:12px 16px;align-items:flex-start;}
.al-chip{width:34px;height:34px;border-radius:9px;background:#f2f2f7;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none;}
.al-body{flex:1;min-width:0;}
.al-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline;}
.al-name{font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.al-amt{font-size:12px;color:rgba(60,60,67,.6);white-space:nowrap;}
.al-bar{margin-top:9px;}
.al-left{margin-top:7px;font-size:12px;color:rgba(60,60,67,.5);}
.al-tabs{margin-top:24px;display:flex;justify-content:space-around;padding:11px 8px 22px;background:rgba(249,249,249,.92);border-top:.5px solid rgba(60,60,67,.16);
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);}
.al-tab{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:500;color:rgba(60,60,67,.5);}
.al-tab.on{color:#007aff;}
`;

function AppleLight() {
  return (
    <div className="al-frame">
      <style>{alCss}</style>
      <div className="al-pad">
        <IosStatus color="#1c1c1e" />
        <div className="al-month">
          <span className="c"><Chev left /></span>
          <span>June 2026</span>
          <span className="c"><Chev /></span>
        </div>
        <div className="al-title">Budget</div>

        <div className="al-card al-hero">
          <div className="al-l">Spent in June 2026</div>
          <div className="al-num">{fmt(SPENT)}</div>
          <div style={{ marginTop: 14 }}>
            <Bar pct={SPENT_PCT} track="#e5e5ea" fill="#007aff" h={6} />
          </div>
          <div className="al-cap">{SPENT_PCT}% of {fmt(15_880_000)} budget</div>
        </div>

        <div className="al-sh">Overview</div>
        <div className="al-card">
          {STATS.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <i className="al-hr text" />}
              <div className="al-lr">
                <span>{s.label}</span>
                <span className="al-lv">{fmt(s.value)}</span>
              </div>
            </Fragment>
          ))}
        </div>

        <div className="al-sh">Categories</div>
        <div className="al-card">
          {CATS.map((c, i) => (
            <Fragment key={c.name}>
              {i > 0 && <i className="al-hr inset" />}
              <div className="al-cr">
                <div className="al-chip">{c.emoji}</div>
                <div className="al-body">
                  <div className="al-top">
                    <span className="al-name">{c.name}</span>
                    <span className="al-amt">{fmt(c.spent)} / {fmt(c.budget)}</span>
                  </div>
                  <div className="al-bar">
                    <Bar pct={c.pct} track="#e5e5ea" fill={c.pct >= 100 ? "#34c759" : "#007aff"} h={4} />
                  </div>
                  <div className="al-left">{fmt(c.left)} left</div>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="al-tabs">
        <div className="al-tab on"><HomeIcon w={2} />Home</div>
        <div className="al-tab"><SavingsIcon />Savings</div>
        <div className="al-tab"><ManageIcon />Manage</div>
      </div>
    </div>
  );
}

/* ── 3 · Clean Fintech (Monarch / Copilot) ───────────────────────────────── */

const ftCss = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.ft-frame{background:#f6f7fb;color:#0b1220;overflow:hidden;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  font-family:'Inter',ui-sans-serif,-apple-system,system-ui,sans-serif;}
.ft-pad{padding:22px 16px 0;}
.ft-top{display:flex;align-items:center;justify-content:space-between;}
.ft-hi{font-size:13px;color:#64748b;font-weight:500;}
.ft-hi b{display:block;color:#0b1220;font-size:18px;font-weight:800;margin-top:2px;letter-spacing:-.01em;}
.ft-av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#10b981,#0ea5e9);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:15px;}
.ft-month{display:inline-flex;align-items:center;gap:11px;margin-top:16px;background:#fff;border:1px solid #eceff4;border-radius:999px;padding:8px 15px;font-size:13px;font-weight:700;box-shadow:0 1px 2px rgba(16,24,40,.04);}
.ft-month .c{color:#94a3b8;display:flex;}
.ft-hero{margin-top:14px;background:#fff;border-radius:24px;padding:22px;border:1px solid #f1f2f6;box-shadow:0 14px 32px -18px rgba(16,24,40,.22);}
.ft-hr{display:flex;align-items:center;justify-content:space-between;gap:16px;}
.ft-l{font-size:13px;color:#64748b;font-weight:600;}
.ft-num{margin-top:7px;font-size:38px;font-weight:800;letter-spacing:-.03em;line-height:1;}
.ft-donut{width:74px;height:74px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
  background:conic-gradient(#10b981 0 ${SPENT_PCT}%,#e8ecf2 ${SPENT_PCT}% 100%);}
.ft-donut span{width:54px;height:54px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#059669;}
.ft-cap{margin-top:11px;font-size:12px;color:#64748b;font-weight:600;}
.ft-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;}
.ft-stat{background:#fff;border-radius:18px;padding:14px 12px;border:1px solid #f1f2f6;box-shadow:0 6px 16px -12px rgba(16,24,40,.2);}
.ft-sl{font-size:11px;color:#64748b;font-weight:700;display:flex;align-items:center;gap:6px;}
.ft-dot{width:7px;height:7px;border-radius:50%;flex:none;}
.ft-sv{margin-top:8px;font-size:14px;font-weight:800;white-space:nowrap;letter-spacing:-.02em;}
.ft-sh{display:flex;align-items:center;justify-content:space-between;margin:24px 6px 12px;}
.ft-sh h3{font-size:17px;font-weight:800;letter-spacing:-.01em;}
.ft-sh span{font-size:12px;color:#059669;font-weight:700;}
.ft-cat{background:#fff;border-radius:18px;padding:14px;margin-bottom:10px;border:1px solid #f1f2f6;box-shadow:0 6px 16px -14px rgba(16,24,40,.22);display:flex;gap:13px;align-items:flex-start;}
.ft-chip{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:21px;flex:none;}
.ft-body{flex:1;min-width:0;}
.ft-ctop{display:flex;justify-content:space-between;gap:10px;align-items:baseline;}
.ft-name{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ft-amt{font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;}
.ft-bar{margin-top:10px;}
.ft-left{margin-top:8px;font-size:12px;color:#94a3b8;font-weight:600;}
.ft-tabs{margin:18px 14px 18px;display:flex;justify-content:space-around;background:#fff;border-radius:20px;padding:13px 8px;border:1px solid #f1f2f6;box-shadow:0 12px 30px -14px rgba(16,24,40,.26);}
.ft-tab{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#94a3b8;}
.ft-tab.on{color:#059669;}
`;

function Fintech() {
  return (
    <div className="ft-frame">
      <style>{ftCss}</style>
      <div className="ft-pad">
        <div className="ft-top">
          <div className="ft-hi">Good morning<b>June overview</b></div>
          <div className="ft-av">JC</div>
        </div>
        <div className="ft-month">
          <span className="c"><Chev left s={15} /></span>
          <span>June 2026</span>
          <span className="c"><Chev s={15} /></span>
        </div>

        <div className="ft-hero">
          <div className="ft-hr">
            <div>
              <div className="ft-l">Spent in June 2026</div>
              <div className="ft-num">{fmt(SPENT)}</div>
            </div>
            <div className="ft-donut"><span>{SPENT_PCT}%</span></div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Bar pct={SPENT_PCT} track="#eef1f5" fill="linear-gradient(90deg,#10b981,#34d399)" h={8} />
          </div>
          <div className="ft-cap">{fmt(13_755_000)} remaining of {fmt(15_880_000)}</div>
        </div>

        <div className="ft-stats">
          {STATS.map((s) => (
            <div className="ft-stat" key={s.label}>
              <div className="ft-sl"><span className="ft-dot" style={{ background: s.dot }} />{s.label}</div>
              <div className="ft-sv">{fmt(s.value)}</div>
            </div>
          ))}
        </div>

        <div className="ft-sh">
          <h3>Categories</h3>
          <span>5 active</span>
        </div>
        {CATS.map((c) => (
          <div className="ft-cat" key={c.name}>
            <div className="ft-chip" style={{ background: `${c.color}22` }}>{c.emoji}</div>
            <div className="ft-body">
              <div className="ft-ctop">
                <span className="ft-name">{c.name}</span>
                <span className="ft-amt">{fmt(c.spent)} / {fmt(c.budget)}</span>
              </div>
              <div className="ft-bar">
                <Bar pct={c.pct} track="#eef1f5" fill={c.pct >= 100 ? "#059669" : "#10b981"} h={7} />
              </div>
              <div className="ft-left">{fmt(c.left)} left to spend</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ft-tabs">
        <div className="ft-tab on"><HomeIcon w={2.1} />Home</div>
        <div className="ft-tab"><SavingsIcon />Savings</div>
        <div className="ft-tab"><ManageIcon />Manage</div>
      </div>
    </div>
  );
}

/* ── 4 · Minimal Mono ─────────────────────────────────────────────────────── */

const mnCss = `
.mn-frame{background:#fff;color:#0a0a0a;overflow:hidden;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;}
.mn-mono{font-family:ui-monospace,"SF Mono","JetBrains Mono",Menlo,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.mn-pad{padding:28px 22px 0;}
.mn-month{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;}
.mn-month .c{color:#c4c4c4;display:flex;}
.mn-hl{margin-top:36px;font-size:10px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#8a8a8a;}
.mn-num{margin-top:12px;font-size:54px;font-weight:300;letter-spacing:-.03em;line-height:1;}
.mn-cap{margin-top:14px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#9a9a9a;font-weight:700;}
.mn-rule{height:1px;background:#ededed;border:0;margin:26px 0;}
.mn-stats{display:flex;}
.mn-stat{flex:1;padding-left:16px;min-width:0;}
.mn-stat:first-child{padding-left:0;}
.mn-stat + .mn-stat{border-left:1px solid #ededed;}
.mn-sl{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9a9a9a;}
.mn-sv{margin-top:9px;font-size:13px;color:#0a0a0a;white-space:nowrap;}
.mn-sh{font-size:10px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#8a8a8a;margin-bottom:2px;}
.mn-cat{padding:18px 0;border-top:1px solid #ededed;}
.mn-ct{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
.mn-name{font-size:15px;font-weight:500;display:flex;align-items:center;gap:10px;min-width:0;}
.mn-name i{font-style:normal;font-size:14px;filter:grayscale(1);opacity:.85;}
.mn-name b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mn-amt{font-size:12px;color:#8a8a8a;white-space:nowrap;}
.mn-bar{margin-top:13px;}
.mn-left{margin-top:9px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#9a9a9a;font-weight:600;}
.mn-tabs{display:flex;justify-content:space-between;padding:20px 4px 26px;border-top:1px solid #0a0a0a;margin-top:32px;}
.mn-tab{display:flex;align-items:center;gap:9px;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#bdbdbd;}
.mn-tab.on{color:#0a0a0a;}
.mn-tab .d{width:6px;height:6px;border-radius:50%;background:transparent;}
.mn-tab.on .d{background:#ff4d2e;}
`;

function Mono() {
  return (
    <div className="mn-frame">
      <style>{mnCss}</style>
      <div className="mn-pad">
        <div className="mn-month">
          <span className="c"><Chev left s={14} w={2.4} /></span>
          <span>June 2026</span>
          <span className="c"><Chev s={14} w={2.4} /></span>
        </div>

        <div className="mn-hl">Spent in June 2026</div>
        <div className="mn-num">{fmt(SPENT)}</div>
        <div style={{ marginTop: 22 }}>
          <Bar pct={SPENT_PCT} track="#ededed" fill="#ff4d2e" h={3} r={0} />
        </div>
        <div className="mn-cap">{SPENT_PCT}% of {fmt(15_880_000)}</div>

        <hr className="mn-rule" />

        <div className="mn-stats">
          {STATS.map((s) => (
            <div className="mn-stat" key={s.label}>
              <div className="mn-sl">{s.label}</div>
              <div className="mn-sv mn-mono">{fmt(s.value)}</div>
            </div>
          ))}
        </div>

        <hr className="mn-rule" />

        <div className="mn-sh">Categories</div>
        {CATS.map((c) => (
          <div className="mn-cat" key={c.name}>
            <div className="mn-ct">
              <span className="mn-name"><i>{c.emoji}</i><b>{c.name}</b></span>
              <span className="mn-amt mn-mono">{fmt(c.spent)} / {fmt(c.budget)}</span>
            </div>
            <div className="mn-bar">
              <Bar pct={c.pct} track="#ededed" fill="#0a0a0a" h={2} r={0} />
            </div>
            <div className="mn-left">{fmt(c.left)} left</div>
          </div>
        ))}
      </div>

      <div className="mn-tabs">
        <div className="mn-tab on"><span className="d" />Home</div>
        <div className="mn-tab"><span className="d" />Savings</div>
        <div className="mn-tab"><span className="d" />Manage</div>
      </div>
    </div>
  );
}

/* ── 5 · Bold & Friendly (Revolut / Cash App energy) ─────────────────────── */

const bfCss = `
.bf-frame{background:#0b0a12;color:#fff;overflow:hidden;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  font-family:ui-rounded,"SF Pro Rounded","Hiragino Maru Gothic ProN",system-ui,sans-serif;}
.bf-pad{padding:22px 16px 0;}
.bf-top{display:flex;align-items:center;justify-content:space-between;}
.bf-month{display:inline-flex;align-items:center;gap:11px;background:#181527;border-radius:999px;padding:9px 15px;font-size:13px;font-weight:700;}
.bf-month .c{color:#8b86a3;display:flex;}
.bf-bell{width:42px;height:42px;border-radius:14px;background:#181527;display:flex;align-items:center;justify-content:center;color:#c8ff3d;}
.bf-hero{margin-top:16px;border-radius:30px;padding:24px;position:relative;overflow:hidden;
  background:linear-gradient(140deg,#7c3aed 0%,#5b21b6 46%,#4338ca 100%);box-shadow:0 24px 48px -22px rgba(124,58,237,.75);}
.bf-hero::after{content:"";position:absolute;width:190px;height:190px;border-radius:50%;background:rgba(200,255,61,.22);filter:blur(8px);top:-78px;right:-54px;}
.bf-l{font-size:13px;font-weight:600;color:rgba(255,255,255,.82);position:relative;}
.bf-num{margin-top:7px;font-size:46px;font-weight:800;letter-spacing:-.03em;line-height:1;position:relative;}
.bf-badge{display:inline-block;margin-top:15px;background:#c8ff3d;color:#1a2e05;font-size:12px;font-weight:800;padding:5px 12px;border-radius:999px;position:relative;}
.bf-bar{margin-top:13px;position:relative;}
.bf-cap{margin-top:11px;font-size:12px;font-weight:600;color:rgba(255,255,255,.82);position:relative;}
.bf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;}
.bf-stat{border-radius:20px;padding:14px 12px;background:#141121;border:1px solid #221d36;}
.bf-sl{font-size:11px;font-weight:600;color:#9a93b5;display:flex;align-items:center;gap:6px;}
.bf-dot{width:7px;height:7px;border-radius:50%;flex:none;}
.bf-sv{margin-top:8px;font-size:14px;font-weight:800;white-space:nowrap;letter-spacing:-.02em;}
.bf-sh{margin:24px 6px 13px;font-size:19px;font-weight:800;letter-spacing:-.01em;}
.bf-cat{display:flex;gap:13px;align-items:flex-start;background:#141121;border:1px solid #211c34;border-radius:22px;padding:14px;margin-bottom:11px;}
.bf-chip{width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none;}
.bf-body{flex:1;min-width:0;}
.bf-ctop{display:flex;justify-content:space-between;gap:10px;align-items:baseline;}
.bf-name{font-size:15px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bf-amt{font-size:12px;color:#9a93b5;font-weight:600;white-space:nowrap;}
.bf-bar2{margin-top:10px;}
.bf-left{margin-top:9px;}
.bf-left span{display:inline-block;background:#1d1830;color:#bcb4dc;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;}
.bf-tabs{margin:20px 16px 20px;display:flex;justify-content:space-around;align-items:center;background:#171327;border:1px solid #241e3a;border-radius:24px;padding:9px;}
.bf-tab{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#7e789a;padding:7px 16px;border-radius:16px;}
.bf-tab.on{color:#1a2e05;background:#c8ff3d;}
`;

function Bold() {
  return (
    <div className="bf-frame">
      <style>{bfCss}</style>
      <div className="bf-pad">
        <div className="bf-top">
          <div className="bf-month">
            <span className="c"><Chev left s={15} /></span>
            <span>June 2026</span>
            <span className="c"><Chev s={15} /></span>
          </div>
          <div className="bf-bell">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          </div>
        </div>

        <div className="bf-hero">
          <div className="bf-l">Spent in June 2026</div>
          <div className="bf-num">{fmt(SPENT)}</div>
          <div className="bf-badge">{SPENT_PCT}% of budget</div>
          <div className="bf-bar">
            <Bar pct={SPENT_PCT} track="rgba(255,255,255,.26)" fill="#c8ff3d" h={9} />
          </div>
          <div className="bf-cap">{fmt(13_755_000)} left to spend</div>
        </div>

        <div className="bf-stats">
          {STATS.map((s) => (
            <div className="bf-stat" key={s.label}>
              <div className="bf-sl"><span className="bf-dot" style={{ background: s.dot }} />{s.label}</div>
              <div className="bf-sv">{fmt(s.value)}</div>
            </div>
          ))}
        </div>

        <div className="bf-sh">Categories</div>
        {CATS.map((c) => (
          <div className="bf-cat" key={c.name}>
            <div className="bf-chip" style={{ background: `${c.color}26` }}>{c.emoji}</div>
            <div className="bf-body">
              <div className="bf-ctop">
                <span className="bf-name">{c.name}</span>
                <span className="bf-amt">{fmt(c.spent)} / {fmt(c.budget)}</span>
              </div>
              <div className="bf-bar2">
                <Bar pct={c.pct} track="#221d36" fill={c.color} h={8} />
              </div>
              <div className="bf-left"><span>{fmt(c.left)} left</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bf-tabs">
        <div className="bf-tab on"><HomeIcon w={2.2} />Home</div>
        <div className="bf-tab"><SavingsIcon w={2} />Savings</div>
        <div className="bf-tab"><ManageIcon w={2} />Manage</div>
      </div>
    </div>
  );
}

/* ── gallery ──────────────────────────────────────────────────────────────── */

const MOCKUPS: { label: string; Render: () => React.JSX.Element }[] = [
  { label: "1 · Apple — Liquid Glass (Dark)", Render: AppleDark },
  { label: "2 · Apple — Light (iOS grouped)", Render: AppleLight },
  { label: "3 · Clean Fintech (Monarch / Copilot)", Render: Fintech },
  { label: "4 · Minimal Mono", Render: Mono },
  { label: "5 · Bold & Friendly (Revolut / Cash App)", Render: Bold },
];

const pageStyle: CSSProperties = {
  position: "relative",
  zIndex: 0,
  isolation: "isolate",
  minHeight: "100dvh",
  width: "100%",
  background: "#0e0e12",
  color: "#e8e8ec",
  padding: "30px 0 80px",
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const frameStyle: CSSProperties = {
  borderRadius: 30,
  overflow: "hidden",
  boxShadow: "0 30px 70px -34px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.05)",
};

export default function ThemesPage() {
  return (
    <main style={pageStyle}>
      <header style={{ maxWidth: 420, margin: "0 auto 22px", padding: "0 18px" }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.01em", margin: 0 }}>Home screen — design directions</h1>
        <p style={{ fontSize: 13, color: "#8a8a93", margin: "6px 0 0", lineHeight: 1.5 }}>
          Same data, five looks. Scroll through, then tell Claude a number to build the whole app in that style.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        {MOCKUPS.map(({ label, Render }) => (
          <section key={label} style={{ width: "100%", maxWidth: 420, margin: "0 auto", padding: "0 12px" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "#a8a8b0", letterSpacing: ".01em", margin: "0 0 11px 6px" }}>{label}</h2>
            <div style={frameStyle}>
              <Render />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
