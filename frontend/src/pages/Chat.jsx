import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import NewChatModal from "../components/NewChatModal";
import ProfileModal from "../components/ProfileModal";
import ScheduledList from "../components/ScheduledList";

export default function Chat() {
  const { user } = useAuth();
  const socket = useSocket();
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);

  const activeChatId = chatId || null;

  const setActiveChatId = (id) => {
    if (id) navigate("/chat/" + id);
    else navigate("/chat");
  };

  useEffect(() => {
    if (!user?._id) return;
    if (activeChatId) {
      localStorage.setItem("lastChatId:" + user._id, activeChatId);
    }
  }, [activeChatId, user?._id]);

  const loadChats = async () => {
    try {
      const res = await api.get("/chats");
      const list = res.data.chats || [];
      setChats(list);

      if (activeChatId && !list.find((c) => c._id === activeChatId)) {
        navigate("/chat", { replace: true });
      }
    } catch (err) {
      console.error("Failed to load chats:", err);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleChatNew = (chat) => {
      setChats((prev) => {
        const exists = prev.find((c) => c._id === chat._id);
        if (exists) return prev;
        return [chat, ...prev];
      });
    };

    const handleChatUpdated = ({ chatId: cid, lastMessage }) => {
      setChats((prev) => {
        const updated = prev.map((c) =>
          c._id === cid ? { ...c, lastMessage } : c
        );
        const target = updated.find((c) => c._id === cid);
        if (!target) return updated;
        return [target, ...updated.filter((c) => c._id !== cid)];
      });
    };

    const handleUserOnline = ({ userId, online, lastSeen }) => {
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          users: chat.users.map((u) =>
            u._id === userId ? { ...u, online, lastSeen: lastSeen || u.lastSeen } : u
          )
        }))
      );
    };

    const handleChatCleared = ({ chatId: cid }) => {
      setChats((prev) =>
        prev.map((c) =>
          c._id === cid ? { ...c, lastMessage: null } : c
        )
      );
    };

    socket.on("chat:new", handleChatNew);
    socket.on("chat:updated", handleChatUpdated);
    socket.on("user:online", handleUserOnline);
    socket.on("messages:cleared", handleChatCleared);

    return () => {
      socket.off("chat:new", handleChatNew);
      socket.off("chat:updated", handleChatUpdated);
      socket.off("user:online", handleUserOnline);
      socket.off("messages:cleared", handleChatCleared);
    };
  }, [socket]);

  const handleChatCreated = (chat) => {
    setChats((prev) => {
      const exists = prev.find((c) => c._id === chat._id);
      if (exists) return prev;
      return [chat, ...prev];
    });
    setActiveChatId(chat._id);
  };

  const activeChat = chats.find((c) => c._id === activeChatId);

  return (
    <div className="h-screen flex overflow-hidden bg-[#d1d7db]">
      <div
        className={
          "w-full md:w-[400px] md:flex flex-col bg-white border-r border-wa-border flex-shrink-0 " +
          (activeChatId ? "hidden md:flex" : "flex")
        }
      >
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          loading={loadingChats}
          onSelectChat={setActiveChatId}
          onNewChat={() => setShowNewChat(true)}
          onOpenProfile={() => setShowProfile(true)}
          onOpenScheduled={() => setShowScheduled(true)}
          currentUser={user}
        />
      </div>

      <div
        className={
          "flex-1 flex flex-col min-w-0 " +
          (activeChatId ? "flex" : "hidden md:flex")
        }
      >
        <ChatArea
          chat={activeChat}
          currentUser={user}
          onBack={() => setActiveChatId(null)}
        />
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleChatCreated}
        />
      )}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showScheduled && (
        <ScheduledList onClose={() => setShowScheduled(false)} currentUser={user} />
      )}
    </div>
  );
}
