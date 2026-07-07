import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function TrialBanner({ subscription }) {
  const navigate = useNavigate();
  if (!subscription || !subscription.trial_active) return null;
  const days = subscription.trial_days_left;
  return (
    <div
      className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white text-sm shadow-md"
      data-testid="trial-banner"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-4 h-4" />
          <span>
            Prueba gratis — te quedan <strong>{days} día{days === 1 ? "" : "s"}</strong>. Suscríbete o compra el acceso de por vida.
          </span>
        </div>
        <button
          onClick={() => navigate("/suscripcion")}
          data-testid="trial-banner-cta"
          className="bg-white/95 text-orange-700 font-semibold text-xs px-3 py-1.5 rounded-full hover:bg-white transition-colors"
        >
          Ver planes
        </button>
      </div>
    </div>
  );
}
