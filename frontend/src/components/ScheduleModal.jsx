import { useState } from "react";
import { X, Clock } from "lucide-react";
import api from "../api";

export default function ScheduleModal({ chatId, content, onClose, onScheduled }) {
  const defaultDate = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() + "-" +
      pad(d.getMonth() + 1) + "-" +
      pad(d.getDate()) + "T" +
      pad(d.getHours()) + ":" +
      pad(d.getMinutes())
    );
  };

  const [when, setWhen] = useState(defaultDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!when) return;

    const when_date = new Date(when);
    if (when_date <= new Date()) {
      setError("Pick a time in the future");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post("/scheduled", {
        chatId,
        content,
        scheduledFor: when_date.toISOString()
      });
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white w-full max-w-md rounded-lg shadow-2xl">
        <div className="bg-wa-teal text-white p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <h2 className="font-medium">Schedule message</h2>
          </div>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-2.5 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <p className="text-xs text-wa-time mb-1.5">Message</p>
            <div className="bg-wa-panel rounded p-3 text-sm text-[#111b21] max-h-32 overflow-y-auto whitespace-pre-wrap">
              {content}
            </div>
          </div>

          <div>
            <p className="text-xs text-wa-green font-medium mb-1.5">Send at</p>
            <input
              type="datetime-local"
              className="wa-input bg-wa-panel border border-wa-border"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </div>

          <p className="text-[11px] text-wa-time">
            The message will be sent automatically at the chosen time, even if you close the app.
          </p>
        </div>

        <div className="p-4 border-t border-wa-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-wa-time hover:bg-wa-panel rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-wa-green text-white rounded hover:bg-wa-darkGreen disabled:opacity-60"
          >
            {loading ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}
