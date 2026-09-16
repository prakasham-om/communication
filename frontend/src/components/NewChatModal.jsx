import { useEffect, useState } from "react";
import { X, Search, Users, MessageSquare, Check } from "lucide-react";
import api, { fileUrl } from "../api";

export default function NewChatModal({ onClose, onCreated }) {
  const [step, setStep] = useState("pick");
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get("/users").then((r) => setUsers(r.data.users || []));
  }, []);

  const startDirect = async (userId) => {
    setBusyId(userId);
    setError("");
    try {
      const res = await api.post("/chats/direct/" + userId);
      onCreated?.(res.data.chat);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start chat");
    } finally {
      setBusyId(null);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one member");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/chats", {
        name: groupName.trim(),
        userIds: selected
      });
      onCreated?.(res.data.chat);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const filtered = users.filter((u) =>
    (u.name + " " + u.email).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
        <div className="bg-wa-teal text-white p-4 flex items-center justify-between rounded-t-lg">
          <h2 className="font-medium">
            {step === "pick" ? "New chat" : "New group"}
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {step === "pick" && (
          <>
            <div className="p-3 border-b border-wa-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-wa-time" />
                <input
                  className="wa-input pl-9 bg-wa-panel"
                  placeholder="Search users"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <button
                onClick={() => { setStep("group"); setError(""); }}
                className="w-full flex items-center gap-3 p-3 hover:bg-wa-panel border-b border-wa-border/60 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-wa-green flex items-center justify-center">
                  <Users size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-[15px] text-wa-green font-medium">New group</p>
                  <p className="text-xs text-wa-time">Chat with multiple people</p>
                </div>
              </button>

              {filtered.length === 0 && (
                <p className="text-center text-wa-time py-8 text-sm">No users found</p>
              )}
              {filtered.map((u) => (
                <button
                  key={u._id}
                  onClick={() => startDirect(u._id)}
                  disabled={busyId === u._id}
                  className="w-full flex items-center gap-3 p-3 hover:bg-wa-panel border-b border-wa-border/60 text-left disabled:opacity-60"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-wa-panel flex items-center justify-center overflow-hidden">
                      {u.avatar ? (
                        <img src={fileUrl(u.avatar)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-semibold text-wa-time">
                          {u.name?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {u.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-wa-green border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-[#111b21] truncate">{u.name}</p>
                    <p className="text-xs text-wa-time truncate">{u.about || u.email}</p>
                  </div>
                  {busyId === u._id ? (
                    <span className="text-xs text-wa-green">...</span>
                  ) : (
                    <MessageSquare size={16} className="text-wa-time" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "group" && (
          <>
            <div className="p-4 border-b border-wa-border">
              <input
                className="w-full border-b-2 border-wa-green outline-none py-2 text-[15px]"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-3 border-b border-wa-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-wa-time" />
                <input
                  className="wa-input pl-9 bg-wa-panel"
                  placeholder="Search users"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((u) => {
                const checked = selected.includes(u._id);
                return (
                  <label
                    key={u._id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-wa-panel border-b border-wa-border/60 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => toggle(u._id)}
                    />
                    <div
                      className={
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 " +
                        (checked ? "bg-wa-green border-wa-green" : "border-wa-time")
                      }
                    >
                      {checked && <Check size={12} className="text-white" />}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-wa-panel flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar ? (
                        <img src={fileUrl(u.avatar)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-semibold text-wa-time">
                          {u.name?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#111b21] truncate">{u.name}</p>
                      <p className="text-xs text-wa-time truncate">{u.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 border-t border-red-100">
            {error}
          </div>
        )}

        {step === "group" && (
          <div className="p-3 border-t border-wa-border flex justify-end gap-2">
            <button
              onClick={() => { setStep("pick"); setSelected([]); setGroupName(""); }}
              className="px-4 py-2 text-sm text-wa-time hover:bg-wa-panel rounded"
            >
              Cancel
            </button>
            <button
              onClick={createGroup}
              disabled={creating}
              className="px-4 py-2 text-sm bg-wa-green text-white rounded hover:bg-wa-darkGreen disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Group (" + selected.length + ")"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
