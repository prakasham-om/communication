import { useEffect, useState } from "react";
import { X, Clock, Trash2 } from "lucide-react";
import api from "../api";

export default function ScheduledList({ onClose, currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/scheduled");
      setItems(res.data.scheduled || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!confirm("Cancel this scheduled message?")) return;
    try {
      await api.delete("/scheduled/" + id);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {
      alert("Failed to cancel");
    }
  };

  const chatTitle = (chat) => {
    if (!chat) return "Unknown chat";
    if (chat.isGroup) return chat.name || "Group";
    const other = chat.users?.find((u) => u._id !== currentUser?._id);
    return other?.name || "Direct chat";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="bg-wa-teal text-white p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <h2 className="font-medium">Scheduled messages</h2>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-5 overflow-y-auto">
          {loading && (
            <p className="text-center text-wa-time py-8 text-sm">Loading...</p>
          )}
          {!loading && items.length === 0 && (
            <div className="text-center py-10">
              <Clock size={40} className="mx-auto text-wa-time/30" />
              <p className="text-wa-time mt-3 text-sm">No scheduled messages</p>
              <p className="text-wa-time/70 mt-1 text-xs">
                Type a message and tap the clock icon to schedule it.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item._id}
                className="border border-wa-border rounded-lg p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-wa-green font-medium">
                    {chatTitle(item.chat)}
                  </p>
                  <p className="text-[11px] text-wa-time mt-0.5">
                    {new Date(item.scheduledFor).toLocaleString()}
                  </p>
                  <p className="text-sm mt-2 text-[#111b21] break-words">
                    {item.content}
                  </p>
                </div>
                <button
                  onClick={() => cancel(item._id)}
                  className="p-2 hover:bg-red-50 rounded text-red-500 flex-shrink-0"
                  title="Cancel"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-wa-border text-center text-[11px] text-wa-time">
          Messages are sent automatically by the server.
        </div>
      </div>
    </div>
  );
}
