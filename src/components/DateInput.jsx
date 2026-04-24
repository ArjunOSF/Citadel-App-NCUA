import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

/**
 * DateInput — a hybrid date control.
 *   • Typable  : accepts MM/DD/YYYY (or M/D/YYYY) while editing. Validates on blur.
 *   • Pickable : a calendar button opens a month-navigable popup.
 *
 * Value is always stored as ISO (YYYY-MM-DD) via onChange. Display is MM/DD/YYYY.
 * When `value` is an empty string the field is blank.
 *
 * Props:
 *   value       : "YYYY-MM-DD" | ""                  — ISO format
 *   onChange    : (iso: string) => void
 *   placeholder : string                              — default "MM/DD/YYYY"
 *   disabled    : boolean
 *   className   : extra classes for the wrapper
 *   required    : boolean (for form submission)
 */
export default function DateInput({
  value = "",
  onChange,
  placeholder = "MM/DD/YYYY",
  disabled = false,
  className = "",
  required = false,
  inputRef,
  small = false,
}) {
  const [typing, setTyping]   = useState(isoToMDY(value));
  const [popOpen, setPopOpen] = useState(false);
  const wrap   = useRef(null);

  // Keep displayed string in sync when the external value changes.
  useEffect(() => { setTyping(isoToMDY(value)); }, [value]);

  // Outside-click/Escape handling for the portaled popup lives inside
  // CalendarPopup itself so it can see both the anchor and the popup node.

  const commitTyping = () => {
    const iso = mdyToIso(typing);
    if (iso === null) {
      // invalid — snap back to the last good value
      setTyping(isoToMDY(value));
    } else if (iso !== value) {
      onChange?.(iso);
    }
  };

  return (
    <div ref={wrap} className={`date-input-wrap ${className}`}>
      <input
        ref={inputRef}
        className={`form-input date-input-field ${small ? "small" : ""}`}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={typing}
        disabled={disabled}
        required={required}
        onChange={(e) => setTyping(autoSlash(e.target.value))}
        onBlur={commitTyping}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commitTyping(); }
          if (e.key === "Escape") { setTyping(isoToMDY(value)); e.currentTarget.blur(); }
        }}
      />
      <button
        type="button"
        className="date-input-btn"
        disabled={disabled}
        onClick={() => setPopOpen((o) => !o)}
        aria-label="Open calendar"
        tabIndex={-1}
      >
        📅
      </button>
      {popOpen && (
        <CalendarPopup
          anchor={wrap}
          value={value}
          onPick={(iso) => { onChange?.(iso); setPopOpen(false); }}
          onClose={() => setPopOpen(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Calendar popup
// ──────────────────────────────────────────────────────────────────────────

function CalendarPopup({ anchor, value, onPick, onClose }) {
  const initial = parseIso(value) || new Date();
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  // Position anchored to the input's viewport rect — renders via portal so it's
  // never clipped by a scrolling modal body.
  const [pos, setPos] = useState(null);
  const popRef = useRef(null);

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor?.current;
      if (!a) return;
      const rect = a.getBoundingClientRect();
      const popHeight = popRef.current?.offsetHeight || 320;
      const popWidth  = popRef.current?.offsetWidth  || 280;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < popHeight + gap && rect.top > popHeight + gap;
      const top = openUp
        ? Math.max(8, rect.top - popHeight - gap)
        : Math.min(window.innerHeight - popHeight - 8, rect.bottom + gap);
      const left = Math.max(8, Math.min(window.innerWidth - popWidth - 8, rect.left));
      setPos({ top, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor]);

  // Outside-click / Escape handling (was on the wrap in the parent; the popup
  // now lives outside so we re-home the listeners here).
  useEffect(() => {
    const onDoc = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (anchor?.current?.contains(e.target)) return;
      onClose?.();
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchor, onClose]);

  const today = new Date();
  const selected = parseIso(value);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow    = new Date(view.y, view.m, 1).getDay(); // 0 = Sun

  // Build the 6x7 grid of day numbers (null for filler cells).
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const stepMonth = (delta) => {
    let m = view.m + delta, y = view.y;
    while (m < 0)  { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    setView({ y, m });
  };

  return createPortal(
    <div
      ref={popRef}
      className="date-picker-pop"
      style={{
        top:  pos ? `${pos.top}px`  : "-9999px",
        left: pos ? `${pos.left}px` : "-9999px",
        // Hide the popup for one frame until we've measured its real height,
        // so the flip-above-on-bottom logic doesn't flash in the wrong spot.
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <div className="dp-head">
        <button type="button" className="dp-nav" onClick={() => stepMonth(-12)}>«</button>
        <button type="button" className="dp-nav" onClick={() => stepMonth(-1)}>‹</button>
        <div className="dp-title">
          <select
            className="dp-select"
            value={view.m}
            onChange={(e) => setView({ ...view, m: parseInt(e.target.value, 10) })}
          >
            {MONTHS.map((mn, idx) => <option key={mn} value={idx}>{mn}</option>)}
          </select>
          <input
            className="dp-year"
            type="number"
            value={view.y}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1900 && v <= 2999) setView({ ...view, y: v });
            }}
          />
        </div>
        <button type="button" className="dp-nav" onClick={() => stepMonth(1)}>›</button>
        <button type="button" className="dp-nav" onClick={() => stepMonth(12)}>»</button>
      </div>

      <div className="dp-dow">
        {DOW.map((d) => <div key={d} className="dp-dow-cell">{d}</div>)}
      </div>
      <div className="dp-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="dp-cell empty" />;
          const isToday = sameDay(today, view.y, view.m, d);
          const isSel   = selected && sameDay(selected, view.y, view.m, d);
          return (
            <button
              key={i}
              type="button"
              className={`dp-cell ${isSel ? "selected" : ""} ${isToday ? "today" : ""}`}
              onClick={() => onPick(fmtIso(view.y, view.m, d))}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="dp-foot">
        <button
          type="button"
          className="dp-link"
          onClick={() => {
            const n = new Date();
            onPick(fmtIso(n.getFullYear(), n.getMonth(), n.getDate()));
          }}
        >
          Today
        </button>
        <button type="button" className="dp-link muted" onClick={() => onPick("")}>Clear</button>
        <button type="button" className="dp-link" onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  );
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ──────────────────────────────────────────────────────────────────────────
// Helpers — exported so others can reuse the formatting logic
// ──────────────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → "MM/DD/YYYY". Tolerates empty / mdy input. */
export function isoToMDY(iso) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  // Already MDY? pass through.
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(iso)) return iso;
  return "";
}

/** "MM/DD/YYYY" → "YYYY-MM-DD". Returns null on invalid, "" on empty. */
export function mdyToIso(s) {
  if (!s || !s.trim()) return "";
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const mm = parseInt(m[1], 10), dd = parseInt(m[2], 10), yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  // Validate real date (handles Feb 30 etc).
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${yyyy}-${pad(mm)}-${pad(dd)}`;
}

/** Parse ISO into a local Date. Returns null if invalid. */
export function parseIso(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

/** "YYYY-MM-DD" string for the given y/m/d (m is 0-based). */
function fmtIso(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function pad(n) { return String(n).padStart(2, "0"); }
function sameDay(date, y, m, d) {
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;
}

/**
 * Auto-insert slashes as the user types digits — "06152024" becomes "06/15/2024".
 * Also permits the user to type slashes themselves.
 */
function autoSlash(raw) {
  // Strip anything that isn't a digit or slash.
  let s = raw.replace(/[^\d/]/g, "");
  // Collapse multiple slashes.
  s = s.replace(/\/{2,}/g, "/");
  // If the user types only digits, insert slashes at the canonical positions.
  if (!s.includes("/")) {
    if (s.length > 4) s = s.slice(0, 2) + "/" + s.slice(2, 4) + "/" + s.slice(4, 8);
    else if (s.length > 2) s = s.slice(0, 2) + "/" + s.slice(2);
  }
  // Cap at MM/DD/YYYY length.
  return s.slice(0, 10);
}
