import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DOW = ["Do","Lu","Ma","Mi","Ju","Vi","Sá"];

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function pad(n) { return String(n).padStart(2, "0"); }
function fmtDate(str) {
  const d = parseDate(str);
  if (!d) return "";
  return `${DOW[d.getDay()].toLowerCase()}, ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase().slice(0,3)} ${d.getFullYear()}`;
}
function fmtTime(str) {
  if (!str) return "";
  const [h, m] = str.split(":").map(Number);
  if (isNaN(h)) return "";
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m || 0)} ${suffix}`;
}

export function PrettyDatePicker({ value, onChange, testId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedDate = parseDate(value);
  const initial = selectedDate || new Date();
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [viewYear, setViewYear] = useState(initial.getFullYear());

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();

  const nav = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const select = (day) => {
    const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange({ target: { value: iso } });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
              className={`ultra-datetime-btn ${open ? "is-open" : ""}`}
              data-testid={testId}>
        <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
        {value ? <span>{fmtDate(value)}</span> : <span className="empty">Elegir fecha</span>}
        <ChevronDown size={14} className="chevron" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="ultra-popover"
          >
            <div className="ultra-cal-head">
              <button type="button" className="ultra-cal-nav" onClick={() => nav(-1)}><ChevronLeft size={14} /></button>
              <div className="ultra-cal-title">{MONTHS[viewMonth]} {viewYear}</div>
              <button type="button" className="ultra-cal-nav" onClick={() => nav(1)}><ChevronRight size={14} /></button>
            </div>
            <div className="ultra-cal-grid">
              {DOW.map(d => <div key={d} className="ultra-cal-dow">{d}</div>)}
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} className="ultra-cal-day is-empty" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                const isSel = selectedDate && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
                return (
                  <div key={day}
                       className={`ultra-cal-day ${isToday ? "is-today" : ""} ${isSel ? "is-selected" : ""}`}
                       onClick={() => select(day)}>
                    {day}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PrettyTimePicker({ value, onChange, testId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const [h, m] = (value || "18:00").split(":").map(Number);
  const hour = isNaN(h) ? 18 : h;
  const minute = isNaN(m) ? 0 : m;
  const isPM = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  const set = (nh, nm, pm) => {
    let final = nh % 12;
    if (pm) final += 12;
    if (nh === 12 && !pm) final = 0;
    onChange({ target: { value: `${pad(final)}:${pad(nm)}` } });
  };

  const bumpHour = (d) => {
    let nh = hour12 + d;
    if (nh < 1) nh = 12;
    if (nh > 12) nh = 1;
    set(nh, minute, isPM);
  };
  const bumpMin = (d) => {
    let nm = minute + d;
    if (nm < 0) nm = 55;
    if (nm > 59) nm = 0;
    set(hour12, nm, isPM);
  };
  const togglePM = () => set(hour12, minute, !isPM);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
              className={`ultra-datetime-btn ${open ? "is-open" : ""}`}
              data-testid={testId}>
        <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
        {value ? <span>{fmtTime(value)}</span> : <span className="empty">Elegir hora</span>}
        <ChevronDown size={14} className="chevron" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="ultra-popover ultra-popover-time"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="ultra-spinner">
                <div className="ultra-spinner-label">Hora</div>
                <button type="button" className="ultra-spinner-btn" onClick={() => bumpHour(1)}>▲</button>
                <div className="ultra-spinner-value">{pad(hour12)}</div>
                <button type="button" className="ultra-spinner-btn" onClick={() => bumpHour(-1)}>▼</button>
              </div>
              <div className="text-white/40 font-black text-2xl pt-6">:</div>
              <div className="ultra-spinner">
                <div className="ultra-spinner-label">Min</div>
                <button type="button" className="ultra-spinner-btn" onClick={() => bumpMin(5)}>▲</button>
                <div className="ultra-spinner-value">{pad(minute)}</div>
                <button type="button" className="ultra-spinner-btn" onClick={() => bumpMin(-5)}>▼</button>
              </div>
              <div className="ultra-spinner">
                <div className="ultra-spinner-label">Periodo</div>
                <button type="button"
                        onClick={togglePM}
                        className="w-14 py-2 rounded-xl font-black text-sm text-white transition-all"
                        style={{
                          background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                          boxShadow: "0 8px 18px -4px rgba(167,139,250,0.5)",
                        }}>
                  {isPM ? "PM" : "AM"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
