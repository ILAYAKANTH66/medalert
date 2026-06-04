"use client";

import { useState } from "react";
import { AlertTriangle, X, Phone, CheckCircle } from "lucide-react";
import { emergencyService } from "@/services/emergency.service";

export function EmergencyButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrigger = async () => {
    setLoading(true);
    setError(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Location unavailable — continue without it
      }

      await emergencyService.triggerEmergency({ lat, lng });
      setTriggered(true);
      setShowConfirm(false);
      setTimeout(() => setTriggered(false), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger emergency");
    } finally {
      setLoading(false);
    }
  };

  if (triggered) {
    return (
      <div className="emergency-success">
        <div className="emergency-success-inner">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <span className="text-emerald-800 font-semibold text-sm">
            Emergency SOS triggered — caretakers notified
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        id="emergency-sos-btn"
        onClick={() => setShowConfirm(true)}
        className="emergency-btn"
        aria-label="Emergency SOS"
        type="button"
      >
        <AlertTriangle className="h-4 w-4" />
        <span>🚨 EMERGENCY HELP</span>
      </button>

      {showConfirm && (
        <div
          className="emergency-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Emergency confirmation"
        >
          <div className="emergency-modal">
            <button
              className="emergency-modal-close"
              onClick={() => { setShowConfirm(false); setError(null); }}
              aria-label="Cancel"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="emergency-modal-icon">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>

            <h2 className="emergency-modal-title">Emergency SOS</h2>
            <p className="emergency-modal-desc">
              This will immediately alert your caretakers and attempt an emergency voice call.
              Only use this in a real emergency.
            </p>

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <div className="emergency-modal-actions">
              <button
                className="emergency-cancel-btn"
                onClick={() => { setShowConfirm(false); setError(null); }}
                disabled={loading}
                type="button"
              >
                Cancel
              </button>
              <button
                id="emergency-confirm-btn"
                className="emergency-confirm-btn"
                onClick={handleTrigger}
                disabled={loading}
                type="button"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Alerting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Yes, Send Emergency Alert
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
