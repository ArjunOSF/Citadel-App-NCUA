import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import osfinLogo from "../assets/osfin-logo.svg";
import { api } from "../api.js";

const ROLE_NAV = {
  Admin:    ["summary", "import", "sources", "accounts", "groups", "rules", "audit"],
  Preparer: ["summary"],
  Approver: ["summary"],
  Auditor:  ["summary", "audit"],
};

const NAV_LABEL = {
  summary:  "Reconciliation summary",
  import:   "Import GL balances",
  sources:  "Data sources",
  accounts: "Manage accounts",
  groups:   "Account groups",
  rules:    "Auto-recon rules",
  audit:    "Audit log",
};

const NAV_ICON = {
  summary:  "📊",
  import:   "📥",
  sources:  "🔌",
  accounts: "📁",
  groups:   "🔗",
  rules:    "⚡",
  audit:    "🔍",
};

export default function Shell({ user, page, onNav, onLogout, period, onPeriodChange, periods, children }) {
  const nav = ROLE_NAV[user.role] || ["summary"];
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("recon_nav_collapsed") === "1"
  );
  useEffect(() => {
    localStorage.setItem("recon_nav_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Period statuses — refreshed each time the user logs in, navigates, or
  // changes the period. Cheap enough to re-fetch proactively.
  const [statuses, setStatuses] = useState([]);
  const loadStatuses = () => {
    api.periodStatuses().then(setStatuses).catch(() => setStatuses([]));
  };
  useEffect(loadStatuses, [period, page]);
  const statusForPeriod = (statuses.find((s) => s.period === period) || {}).status
    || defaultStatus(period);

  return (
    <div className={`shell ${collapsed ? "nav-collapsed" : ""}`}>
      <aside className="sidenav">
        <div className="brand">
          <img src={osfinLogo} alt="Osfin" className="brand-logo" />
          <div className="brand-text">
            <div className="brand-sub">Account reconciliation</div>
          </div>
        </div>

        <nav className="nav-list">
          {nav.map((p) => (
            <button
              key={p}
              className={`nav-item ${page === p ? "active" : ""}`}
              onClick={() => onNav(p)}
              title={collapsed ? NAV_LABEL[p] : undefined}
            >
              <span className="nav-icon">{NAV_ICON[p]}</span>
              <span className="nav-label">{NAV_LABEL[p]}</span>
            </button>
          ))}
        </nav>

        <div className="nav-footer">
          <div className="user-card">
            <div className="avatar" title={collapsed ? user.name : undefined}>
              {initials(user.name)}
            </div>
            <div className="user-card-text">
              <div className="user-name">{user.name}</div>
              <div className={`role-pill role-${user.role.toLowerCase()}`}>{user.role}</div>
            </div>
          </div>
          <button className="btn ghost full" onClick={onLogout} title={collapsed ? "Sign out" : undefined}>
            <span className="nav-label">Sign out</span>
            <span className="nav-label-collapsed" aria-hidden="true">⎋</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "»" : "«"}
            </button>
            <div className="topbar-title">{NAV_LABEL[page] || ""}</div>
          </div>
          <div className="topbar-right">
            <PeriodStatusChip
              period={period}
              status={statusForPeriod}
              canEdit={user.role === "Admin"}
              onChange={async (next) => {
                if (!period) return;
                try {
                  await api.setPeriodStatus(period, next);
                  loadStatuses();
                } catch (e) { alert(e.message || "Failed to change status"); }
              }}
            />
            <PeriodPicker
              period={period}
              onChange={onPeriodChange}
              knownPeriods={periods}
              statuses={statuses}
            />
          </div>
        </header>
        <div className="page-body">{children}</div>
      </main>
    </div>
  );
}

function formatPeriod(p) {
  if (!p) return "—";
  const [y, m] = p.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

/**
 * PeriodPicker — calendar-style month/year selector.
 *
 *   Button:  shows the currently-selected period, e.g. "Apr 2026".
 *   Popup:   year navigation header + 12-month grid. Each cell shows the
 *            month label and a status dot colour-coded by the period's
 *            lifecycle status (Future / Open / Soft-Close / Closed /
 *            Reopened). Known periods (ones with actual recon data) are
 *            marked with a small dot indicator.
 *
 * Any month is selectable — past, current, or future — so users can jump
 * to, say, Q4 2027 to configure forward schedules.
 *
 * Rendered via a portal so it escapes the topbar's overflow clip.
 */
function PeriodPicker({ period, onChange, knownPeriods, statuses }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const [y] = (period || "").split("-").map(Number);
    return y || new Date().getFullYear();
  });
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const [y] = (period || "").split("-").map(Number);
    if (y) setViewYear(y);
  }, [open, period]);

  // Portal positioning — recomputed when opened / scrolled / resized.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = btnRef.current;
      if (!a) return;
      const rect = a.getBoundingClientRect();
      const popHeight = popRef.current?.offsetHeight || 320;
      const popWidth  = popRef.current?.offsetWidth  || 300;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < popHeight + gap && rect.top > popHeight + gap;
      const top = openUp
        ? Math.max(8, rect.top - popHeight - gap)
        : Math.min(window.innerHeight - popHeight - 8, rect.bottom + gap);
      // Right-align with the trigger so the popup hugs the topbar edge.
      const left = Math.max(8, Math.min(
        window.innerWidth - popWidth - 8,
        rect.right - popWidth,
      ));
      setPos({ top, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const statusMap = useMemo(() => {
    const m = new Map();
    for (const s of statuses || []) m.set(s.period, s.status);
    return m;
  }, [statuses]);

  const knownSet = useMemo(() => new Set(knownPeriods || []), [knownPeriods]);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const statusFor = (p) => statusMap.get(p) || defaultStatus(p);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const pick = (y, mIdx) => {
    const p = `${y}-${String(mIdx + 1).padStart(2, "0")}`;
    onChange(p);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="period-picker-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="muted small">Period</span>
        <span className="period-picker-val">{formatPeriod(period) || "—"}</span>
        <span className="period-picker-caret" aria-hidden="true">▾</span>
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          className="period-picker-pop"
          style={{
            top:  pos ? `${pos.top}px`  : "-9999px",
            left: pos ? `${pos.left}px` : "-9999px",
            visibility: pos ? "visible" : "hidden",
          }}
        >
          <div className="pp-head">
            <button type="button" className="pp-nav" onClick={() => setViewYear((y) => y - 10)} title="−10 years">«</button>
            <button type="button" className="pp-nav" onClick={() => setViewYear((y) => y - 1)} title="Previous year">‹</button>
            <div className="pp-year">
              <input
                type="number"
                value={viewYear}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1900 && v <= 2999) setViewYear(v);
                }}
              />
            </div>
            <button type="button" className="pp-nav" onClick={() => setViewYear((y) => y + 1)} title="Next year">›</button>
            <button type="button" className="pp-nav" onClick={() => setViewYear((y) => y + 10)} title="+10 years">»</button>
          </div>

          <div className="pp-grid">
            {months.map((label, i) => {
              const p = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
              const isSel = p === period;
              const isCurrent = p === currentPeriod;
              const st = statusFor(p);
              const hasData = knownSet.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  className={`pp-cell status-period-${slugStatus(st)} ${isSel ? "selected" : ""} ${isCurrent ? "current" : ""}`}
                  onClick={() => pick(viewYear, i)}
                  title={`${label} ${viewYear} · ${st}${hasData ? " · has data" : ""}`}
                >
                  <span className="pp-cell-label">{label}</span>
                  <span className="pp-cell-status">
                    <span className={`status-dot status-period-${slugStatus(st)}`} />
                    {st}
                  </span>
                  {hasData ? <span className="pp-cell-dot" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="pp-foot">
            <button
              type="button"
              className="dp-link"
              onClick={() => {
                const p = currentPeriod;
                setViewYear(now.getFullYear());
                onChange(p);
                setOpen(false);
              }}
            >
              Today · {formatPeriod(currentPeriod)}
            </button>
            <button type="button" className="dp-link" onClick={() => setOpen(false)}>Close</button>
          </div>

          <div className="pp-legend">
            <span><span className="status-dot status-period-future" />Future</span>
            <span><span className="status-dot status-period-open" />Open</span>
            <span><span className="status-dot status-period-soft-close" />Soft-Close</span>
            <span><span className="status-dot status-period-closed" />Closed</span>
            <span><span className="status-dot status-period-reopened" />Reopened</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// PRD-style period lifecycle statuses.
const PERIOD_STATUSES = ["Future", "Open", "Soft-Close", "Closed", "Reopened"];

function defaultStatus(period) {
  if (!period) return "Open";
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (period < cur) return "Closed";
  if (period === cur) return "Open";
  return "Future";
}

function PeriodStatusChip({ period, status, canEdit, onChange }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const cls = `period-status-chip status-period-${slugStatus(status)}`;
  if (!canEdit) {
    return <span className={cls} title="Period lifecycle status">{status}</span>;
  }
  return (
    <div className="period-status-wrap" ref={wrap}>
      <button type="button" className={cls + " editable"} onClick={() => setOpen((o) => !o)}
              title="Change period status">
        {status} ▾
      </button>
      {open ? (
        <div className="period-status-pop">
          <div className="period-status-pop-title muted small">Set {period} status</div>
          {PERIOD_STATUSES.map((s) => (
            <button
              key={s}
              className={`period-status-opt ${s === status ? "active" : ""}`}
              onClick={() => { setOpen(false); if (s !== status) onChange(s); }}
            >
              <span className={`status-dot status-period-${slugStatus(s)}`} />
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function slugStatus(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

function initials(name = "") {
  const parts = name.replace(",", "").trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts[parts.length - 1]?.[0] || "";
  return (first + last).toUpperCase();
}
