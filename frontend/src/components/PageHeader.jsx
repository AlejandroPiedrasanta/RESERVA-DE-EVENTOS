import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Animated page header shared across internal pages.
 *
 * Props:
 *  - icon: lucide-react icon component
 *  - title: string (main title)
 *  - subtitle: string (optional)
 *  - gradient: CSS gradient for the icon tile & underline
 *  - iconColor: solid color fallback (unused if gradient set)
 *  - right: ReactNode rendered on the right (buttons, filters, etc.)
 *  - className: extra classes for the wrapper
 */
export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  gradient = "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)",
  right,
  className = "",
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-wrap items-center justify-between gap-4 mb-8 ${className}`}
      data-testid="page-header"
    >
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <motion.div
            initial={{ scale: 0, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
            className="relative shrink-0"
          >
            {/* Pulsing halo */}
            <motion.span
              className="absolute inset-0 rounded-2xl"
              style={{ background: gradient }}
              animate={{ scale: [1, 1.35], opacity: [0.35, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            />
            {/* Icon tile */}
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ rotate: [0, -8, 8, 0], scale: 1.06 }}
              className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: gradient,
                boxShadow: "0 10px 26px -10px rgba(99,102,241,0.55)",
              }}
            >
              <Icon size={20} className="text-white" strokeWidth={2.2} />
            </motion.div>
            {/* Sparkle chip */}
            <motion.span
              className="absolute -top-1 -right-1 text-amber-300"
              animate={{
                rotate: [0, 18, 0],
                scale: [1, 1.25, 1],
                opacity: [0.55, 1, 0.55],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={11} strokeWidth={2.5} fill="currentColor" />
            </motion.span>
          </motion.div>
        )}

        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl font-black gradient-text tracking-tight leading-none"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            {title}
          </motion.h1>

          {/* Animated underline accent */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: gradient, transformOrigin: "left" }}
            className="h-[3px] w-16 rounded-full mt-2"
          />

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35 }}
              className="text-sm text-slate-500 font-semibold mt-2"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>

      {right && (
        <div className="flex items-center gap-2 flex-wrap">
          {right}
        </div>
      )}
    </motion.div>
  );
}
