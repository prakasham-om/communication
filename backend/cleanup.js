import cron from "node-cron";
import Message from "./models/Message.js";
import Chat from "./models/Chat.js";

const TTL_DAYS = Number(process.env.MESSAGE_TTL_DAYS || 3);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Deletes every message older than MESSAGE_TTL_DAYS (default: 3 days).
 * Runs every hour. Also runs once at startup.
 *
 * Because MongoDB also has a TTL index on Message.createdAt, documents
 * are ALSO auto-deleted by MongoDB. This cron job is a second safety net
 * and keeps chats' lastMessage field consistent + notifies clients.
 */
export const startCleanup = (io) => {
  const runCleanup = async () => {
    try {
      const cutoff = new Date(Date.now() - TTL_MS);

      const affectedChats = await Message.distinct("chat", {
        createdAt: { $lt: cutoff }
      });

      if (affectedChats.length === 0) return;

      const result = await Message.deleteMany({
        createdAt: { $lt: cutoff }
      });

      console.log(
        "Auto-clear: removed " +
          result.deletedCount +
          " message(s) older than " +
          TTL_DAYS +
          " day(s) from " +
          affectedChats.length +
          " chat(s)"
      );

      for (const chatId of affectedChats) {
        try {
          const latest = await Message.findOne({ chat: chatId })
            .sort({ createdAt: -1 })
            .select("_id");

          await Chat.findByIdAndUpdate(chatId, {
            lastMessage: latest ? latest._id : null,
            lastClearedAt: new Date()
          });

          io.to("chat:" + chatId.toString()).emit("messages:cleared", {
            chatId: chatId.toString(),
            cutoff: cutoff.toISOString()
          });
        } catch (err) {
          console.error("Cleanup: failed to refresh chat", chatId, err.message);
        }
      }
    } catch (err) {
      console.error("Cleanup error:", err.message);
    }
  };

  runCleanup();

  cron.schedule("0 * * * *", runCleanup);

  console.log(
    "Auto-clear started - messages older than " +
      TTL_DAYS +
      " day(s) are removed every hour"
  );
};
