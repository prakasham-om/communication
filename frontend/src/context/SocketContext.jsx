import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      setSocket((prev) => { if (prev) prev.disconnect(); return null; });
      return;
    }

    const s = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    s.on("connect", () => console.log("Socket connected:", s.id));
    s.on("connect_error", (err) => console.log("Socket error:", err.message));
    s.on("disconnect", (reason) => console.log("Socket disconnected:", reason));

    setSocket(s);

    return () => { s.disconnect(); };
  }, [user?._id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
