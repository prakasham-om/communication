import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, MoreVertical, Search, Send, Paperclip, X, Users,
  FileText, Check, CheckCheck, Clock
} from "lucide-react";
import api, { fileUrl } from "../api";
import { useSocket } from "../context/SocketContext";
import ScheduleModal from "./ScheduleModal";

export default function ChatArea({ chat, currentUser, onBack }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [userOnline, setUserOnline] = useState({});
  const [showSchedule, setShowSchedule] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const typingTimer = useRef(null);

  const chatId = chat?._id;

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMessages([]);

    (async () => {
      try {
        const res = await api.get("/messages/" + chatId);
        if (!cancelled) {
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        console.error("Load messages error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    if (socket) {
      socket.emit("chat:join", chatId);
      socket.emit("messages:read", { chatId });
    }

    return () => {
      cancelled = true;
    };
  }, [chatId, socket]);

  useEffect(() => {
    if (!socket || !chatId) return;

    const matches = (msg) => {
      const msgChat = msg.chat?._id || msg.chat;
      return String(msgChat) === String(chatId);
    };

    const onNew = (msg) => {
      if (!matches(msg)) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        if (msg.tempId) {
          const idx = prev.findIndex((m) => m._id === msg.tempId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = msg;
            return copy;
          }
        }
        return [...prev, msg];
      });
      if (msg.sender?._id !== currentUser._id) {
        socket.emit("messages:read", { chatId });
      }
    };

    const onRead = ({ chatId: rid, userId }) => {
      if (rid !== chatId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender?._id === currentUser._id
            ? { ...m, readBy: [...new Set([...(m.readBy || []), userId])] }
            : m
        )
      );
    };

    const onTypingStart = ({ chatId: rid, user: u }) => {
      if (rid !== chatId || u._id === currentUser._id) return;
      setTypingUser(u);
    };

    const onTypingStop = ({ chatId: rid }) => {
      if (rid !== chatId) return;
      setTypingUser(null);
    };

    const onUserOnline = ({ userId, online, lastSeen }) => {
      setUserOnline((prev) => ({ ...prev, [userId]: { online, lastSeen } }));
    };

    const onMessagesCleared = ({ chatId: rid }) => {
      if (rid !== chatId) return;
      api.get("/messages/" + chatId)
        .then((res) => setMessages(res.data.messages || []))
        .catch(() => {});
    };

    const onScheduledSent = () => {
      api.get("/messages/" + chatId)
        .then((res) => setMessages(res.data.messages || []))
        .catch(() => {});
    };

    socket.on("message:new", onNew);
    socket.on("messages:read", onRead);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("user:online", onUserOnline);
    socket.on("messages:cleared", onMessagesCleared);
    socket.on("scheduled:sent", onScheduledSent);

    return () => {
      socket.off("message:new", onNew);
      socket.off("messages:read", onRead);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("user:online", onUserOnline);
      socket.off("messages:cleared", onMessagesCleared);
      socket.off("scheduled:sent", onScheduledSent);
    };
  }, [socket, chatId, currentUser._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-wa-panel relative">
        <div className="text-center px-6">
          <div className="w-40 h-40 rounded-full bg-white/60 flex items-center justify-center mx-auto">
            <Send size={64} className="text-wa-time/40" />
          </div>
          <h2 className="mt-6 text-3xl font-light text-[#41525d]">ChatWave</h2>
          <p className="text-wa-time mt-3 text-sm max-w-md">
            Select a chat or start a new conversation to begin.
          </p>
          <p className="text-wa-time/70 mt-2 text-xs">
            Messages auto-delete after 3 days.
          </p>
        </div>
      </div>
    );
  }

  const otherUser = !chat.isGroup
    ? chat.users.find((u) => u._id !== currentUser._id) || {}
    : null;

  const title = chat.isGroup ? (chat.name || "Group") : (otherUser?.name || "Unknown");
  const liveOnline = otherUser ? userOnline[otherUser._id]?.online : null;
  const isOnline = liveOnline ?? otherUser?.online;
  const subtitle = chat.isGroup
    ? (chat.users?.length || 0) + " members"
    : typingUser
      ? "typing..."
      : isOnline ? "online" : "offline";

  const emitTyping = () => {
    if (!socket || !chatId) return;
    socket.emit("typing:start", { chatId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing:stop", { chatId });
    }, 1500);
  };

  const sendMessage = async () => {
    if (!text.trim() && !file) return;
    setSending(true);

    try {
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post("/messages/" + chatId + "/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }

      if (text.trim() && socket) {
        const tempId = "temp-" + Date.now();
        const optimistic = {
          _id: tempId,
          chat: chatId,
          sender: { _id: currentUser._id, name: currentUser.name, avatar: currentUser.avatar },
          content: text.trim(),
          type: "text",
          createdAt: new Date().toISOString(),
          readBy: [currentUser._id],
          optimistic: true
        };
        setMessages((prev) => [...prev, optimistic]);

        socket.emit("message:send", {
          chatId,
          content: text.trim(),
          tempId
        });
        setText("");
        socket.emit("typing:stop", { chatId });
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <header className="h-14 md:h-16 bg-wa-panel border-b border-wa-border px-3 md:px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button onClick={onBack} className="md:hidden p-1.5 rounded-full hover:bg-black/5">
            <ArrowLeft size={20} className="text-[#54656f]" />
          </button>
          <div className="w-10 h-10 rounded-full bg-wa-time/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {!chat.isGroup && otherUser?.avatar ? (
              <img src={fileUrl(otherUser.avatar)} alt="" className="w-full h-full object-cover" />
            ) : chat.isGroup ? (
              <Users size={20} className="text-wa-time" />
            ) : (
              <span className="font-semibold text-wa-time">
                {title[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] text-[#111b21] truncate leading-tight">{title}</h2>
            <p className="text-[12px] text-wa-time truncate leading-tight">
              {typingUser ? (
                <span className="text-wa-green italic">{typingUser.name} typing...</span>
              ) : subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-black/5 hidden md:block">
            <Search size={20} className="text-[#54656f]" />
          </button>
          <button className="p-2 rounded-full hover:bg-black/5">
            <MoreVertical size={20} className="text-[#54656f]" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto chat-bg px-3 py-4 md:px-6 md:py-5">
        {loading && (
          <p className="text-center text-wa-time text-sm">Loading messages...</p>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-wa-time text-sm">No messages yet. Say hi!</p>
            <p className="text-wa-time/70 text-xs mt-1">
              Messages in this chat auto-delete after 3 days.
            </p>
          </div>
        )}

        <div className="space-y-1">
          {messages.map((m, idx) => (
            <Bubble
              key={m._id}
              message={m}
              isOwn={m.sender?._id === currentUser._id}
              showAvatar={
                chat.isGroup &&
                m.sender?._id !== currentUser._id &&
                (idx === 0 || messages[idx - 1]?.sender?._id !== m.sender?._id)
              }
            />
          ))}
        </div>
        <div ref={endRef} />
      </div>

      {file && (
        <div className="px-3 py-2 bg-wa-panel border-t border-wa-border flex items-center justify-between">
          <span className="text-sm text-[#111b21] truncate">{file.name}</span>
          <button onClick={() => { setFile(null); fileRef.current.value = ""; }}>
            <X size={18} className="text-wa-time" />
          </button>
        </div>
      )}

      <div className="bg-wa-panel border-t border-wa-border px-3 py-2 flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-full hover:bg-black/5 text-[#54656f]"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); emitTyping(); }}
          onKeyDown={onKey}
          placeholder="Type a message"
          rows={1}
          className="flex-1 resize-none wa-input bg-white min-h-[42px] max-h-32 py-2.5"
        />

        {text.trim() && !file && (
          <button
            onClick={() => setShowSchedule(true)}
            className="p-2 rounded-full hover:bg-black/5 text-[#54656f]"
            title="Schedule message"
          >
            <Clock size={20} />
          </button>
        )}

        <button
          onClick={sendMessage}
          disabled={sending || (!text.trim() && !file)}
          className="w-11 h-11 rounded-full bg-wa-green hover:bg-wa-darkGreen text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
        >
          <Send size={20} />
        </button>
      </div>

      {showSchedule && (
        <ScheduleModal
          chatId={chatId}
          content={text.trim()}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => setText("")}
        />
      )}
    </>
  );
}

function Bubble({ message, isOwn, showAvatar }) {
  const isSystem = message.type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <p className="text-[11px] text-wa-time bg-white/80 px-3 py-1 rounded-full shadow-sm">
          {message.content}
        </p>
      </div>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  const isRead = message.readBy && message.readBy.length > 1;

  return (
    <div className={"flex " + (isOwn ? "justify-end" : "justify-start")}>
      <div className="max-w-[85%] md:max-w-[65%]">
        {!isOwn && showAvatar && (
          <p className="text-[11px] text-wa-green font-medium mb-0.5 px-1">
            {message.sender?.name}
          </p>
        )}
        <div
          className={
            "relative rounded-lg px-2.5 py-1.5 shadow-sm " +
            (isOwn
              ? "bg-wa-lightGreen rounded-tr-none"
              : "bg-white rounded-tl-none")
          }
        >
          {message.type === "image" && message.fileUrl ? (
            <img
              src={fileUrl(message.fileUrl)}
              alt=""
              className="rounded max-w-xs max-h-80 object-cover"
            />
          ) : message.type === "file" && message.fileUrl ? (
            <a
              href={fileUrl(message.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-[#027eb5] py-1"
            >
              <FileText size={18} />
              <span className="text-sm underline truncate max-w-[200px]">
                {message.fileName}
              </span>
            </a>
          ) : (
            <p className="text-[14.2px] leading-[19px] text-[#111b21] whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
            <span className="text-[10.5px] text-wa-time">{time}</span>
            {isOwn && (
              <span className="text-wa-time">
                {isRead ? (
                  <CheckCheck size={14} className="text-wa-blue" />
                ) : (
                  <Check size={14} />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
