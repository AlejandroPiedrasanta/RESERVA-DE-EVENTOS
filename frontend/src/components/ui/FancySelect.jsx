import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

/**
 * FancySelect — modern animated dropdown replacement for native <select>.
 *
 * Props:
 *  - value:      current selected value
 *  - onChange:   (val) => void
 *  - options:    Array<{ value, label, icon?, color?, dot? }>
 *  - placeholder
 *  - active:     boolean — highlights the trigger when a non-default option is selected
 *  - accent:     tailwind gradient class-name for active trigger (defaults to btn-primary)
 *  - testId
 *  - triggerClassName
 */
export default function FancySelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  active = false,
  testId,
  triggerClassName = "",
  minWidth = 168,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);
  const label = selected?.label || placeholder;
  const SelectedIcon = selected?.icon;

  return (
    <div ref={rootRef} className="relative" style={{ minWidth }}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(v => !v)}
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center gap-2 pl-4 pr-3 py-3 rounded-2xl text-sm font-bold cursor-pointer transition-all shadow-sm ${
          active
            ? "btn-primary text-white shadow-md"
            : "glass text-slate-700 hover:shadow-md"
        } ${triggerClassName}`}
      >
        {SelectedIcon && (
          <SelectedIcon
            size={15}
            className={active ? "text-white/95" : "text-slate-500"}
            strokeWidth={2.2}
          />
        )}
        {selected?.dot && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: selected.dot }}
          />
        )}
        <span className="truncate flex-1 text-left">{label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown
            size={15}
            className={active ? "text-white/90" : "text-slate-400"}
            strokeWidth={2.4}
          />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            role="listbox"
            className="absolute z-40 mt-2 right-0 min-w-full w-max max-w-[280px] rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl ring-1 ring-black/5 p-1.5 overflow-hidden"
            data-testid={testId ? `${testId}-menu` : undefined}
          >
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {options.map((opt) => {
                const isSel = opt.value === value;
                const Icon = opt.icon;
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    whileHover={{ x: 3 }}
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    data-testid={testId ? `${testId}-option-${String(opt.value).toLowerCase()}` : undefined}
                    className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-colors ${
                      isSel
                        ? "bg-gradient-to-r from-[var(--t-from)]/12 to-[var(--t-to)]/12 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    role="option"
                    aria-selected={isSel}
                  >
                    {Icon ? (
                      <Icon
                        size={15}
                        style={opt.color ? { color: opt.color } : undefined}
                        className={!opt.color ? "text-slate-500" : ""}
                        strokeWidth={2.2}
                      />
                    ) : opt.dot ? (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: opt.dot }}
                      />
                    ) : (
                      <span className="w-2 h-2" />
                    )}
                    <span className="truncate flex-1">{opt.label}</span>
                    {isSel && (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 18 }}
                        className="w-5 h-5 rounded-full btn-primary flex items-center justify-center shadow-sm"
                      >
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
