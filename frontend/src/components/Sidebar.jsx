import { useEffect, useMemo, useState } from "react";
import {
  MessageSquarePlus, Search, MoreVertical, Users, LogOut,
  User as UserIcon, Circle, Clock, Trash2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { fileUrl } from "../api";

const TABS = ["All", "Unread", "Groups"];

export default function Sidebar({
  chats, activeChatId, loading, onSelectChat, onNewChat,
  onOpenProfile, onOpenScheduled, currentUser
}) {
  const { logout } = useAuth();
  const socket = useSocket();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [typing, setTyping] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onStart = ({ chatId, user: u }) => {
      setTyping((t) => ({ ...t, [chatId]: u.name }));
    };
    const onStop = ({ chatId }) => {
      setTyping((t) => {
        const copy = { ...t };
        delete copy[chatId];
        return copy;
      });
    };
    socket.on("typing:start", onStart);
    socket.on("typing:stop", onStop);
    return () => {
      socket.off("typing:start", onStart);
      socket.off("typing:stop", onStop);
    };
  }, [socket]);

  const chatInfo = (chat) => {
    if (chat.isGroup) {
      return {
        title: chat.name || "Group",
        avatar: null,
        subtitle: (chat.users?.length || 0) + " members",
        online: false
      };
    }
    const other = chat.users?.find((u) => u._id !== currentUser._id) || {};
    return {
      title: other.name || "Unknown",
      avatar: other.avatar,
      subtitle: other.online ? "online" : "offline",
      online: other.online
    };
  };

  const filtered = useMemo(() => {
    let list = chats;
    if (tab === "Groups") list = list.filter((c) => c.isGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => chatInfo(c).title.toLowerCase().includes(q));
    }
    return list;
  }, [chats, tab, search, currentUser._id]);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const yest = new Date(now.getTime() - 86400000);
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  };

  return (
    <aside className="w-full h-full bg-white flex flex-col">
      <div className="h-14 bg-wa-panel border-b border-wa-border flex items-center justify-between px-4 flex-shrink-0">
        <button onClick={onOpenProfile} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-wa-time/20 flex items-center justify-center overflow-hidden">
            {currentUser?.avatar ? (
              <img src={fileUrl(currentUser.avatar)} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-semibold text-wa-time">
                {currentUser?.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <span className="font-medium text-[#111b21] text-[15px]">Chats</span>
        </button>

        <div className="flex items-center gap-1 relative">
          <button
            onClick={onNewChat}
            className="p-2 rounded-full hover:bg-black/5"
            title="New chat"
          >
            <MessageSquarePlus size={20} className="text-[#54656f]" />
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-full hover:bg-black/5"
          >
            <MoreVertical size={20} className="text-[#54656f]" />
          </button>
          {menuOpen && (
            <div className="absolute top-11 right-0 bg-white rounded-md shadow-xl border border-wa-border w-52 z-30">
              <button
                onClick={() => { setMenuOpen(false); onOpenProfile(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-wa-panel text-sm flex items-center gap-2 text-[#111b21]"
              >
                <UserIcon size={16} /> Profile
              </button>
              <button
                onClick={() => { setMenuOpen(false); onOpenScheduled(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-wa-panel text-sm flex items-center gap-2 text-[#111b21]"
              >
                <Clock size={16} /> Scheduled messages
              </button>
              <div className="border-t border-wa-border" />
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2.5 hover:bg-wa-panel text-sm flex items-center gap-2 text-red-600"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-2 border-b border-wa-border">
        <div className="relative">
          {/* <Search size={16} className="absolute left-3 top-3 text-wa-time" /> */}
          <input
            className="wa-input pl-9 bg-wa-panel"
            placeholder="Search or start a new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-2 py-1.5 border-b border-wa-border flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-3 py-1 rounded-full text-xs font-medium " +
              (tab === t ? "bg-wa-green text-white" : "text-wa-time hover:bg-wa-panel")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-center text-wa-time py-8 text-sm">Loading chats...</p>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-14 px-6">
            <Users size={40} className="mx-auto text-wa-time/30" />
            <p className="text-wa-time mt-3 text-sm">No chats yet</p>
            <button
              onClick={onNewChat}
              className="mt-3 text-wa-green text-sm font-medium"
            >
              Start a conversation
            </button>
          </div>
        )}
        {filtered.map((chat) => {
          const info = chatInfo(chat);
          const active = chat._id === activeChatId;
          const typingUser = typing[chat._id];
          const lastMsg = chat.lastMessage;
          const preview = typingUser
            ? typingUser + " is typing..."
            : lastMsg
              ? (lastMsg.type === "system"
                  ? lastMsg.content
                  : lastMsg.sender?._id === currentUser._id
                    ? "You: " + (lastMsg.content || "attachment")
                    : (chat.isGroup ? (lastMsg.sender?.name || "") + ": " : "") +
                      (lastMsg.content || "attachment"))
              : chat.isGroup ? info.subtitle : "Tap to chat";

          return (
            <button
              key={chat._id}
              onClick={() => onSelectChat(chat._id)}
              className={
                "w-full flex items-center gap-3 px-3 py-2.5 border-b border-wa-border/60 text-left " +
                (active ? "bg-wa-panel" : "hover:bg-wa-panel/60")
              }
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-wa-panel flex items-center justify-center overflow-hidden">
                  {info.avatar ? (
                    <img src={fileUrl(info.avatar)} alt="" className="w-full h-full object-cover" />
                  ) : chat.isGroup ? (
                    <Users size={20} className="text-wa-time" />
                  ) : (
                    <span className="text-base font-semibold text-wa-time">
                      {info.title[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                {!chat.isGroup && info.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-wa-green border-2 border-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] text-[#111b21] truncate">{info.title}</p>
                  <span className="text-[11px] text-wa-time flex-shrink-0">
                    {formatTime(chat.updatedAt)}
                  </span>
                </div>
                <p className="text-[13px] text-wa-time truncate mt-0.5">
                  {typingUser ? (
                    <span className="text-wa-green italic">{preview}</span>
                  ) : preview}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-2 bg-wa-panel border-t border-wa-border text-center text-[11px] text-wa-time flex-shrink-0">
        <Trash2 size={10} className="inline text-wa-time" />
        <span className="ml-1">Messages auto-delete after 3 days</span>
      </div>
    </aside>
  );
}
