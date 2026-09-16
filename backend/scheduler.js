import cron from "node-cron";
import ScheduledMessage from "./models/ScheduledMessage.js";
import Message from "./models/Message.js";
import Chat from "./models/Chat.js";

export const startScheduler = (io) => {
  cron.schedule("*/20 * * * * *", async () => {
    try {
      const now = new Date();
      const due = await ScheduledMessage.find({
        status: "pending",
        scheduledFor: { $lte: now }
      }).limit(50);

      if (due.length === 0) return;
      console.log("Processing " + due.length + " scheduled message(s)");

      for (const item of due) {
        try {
          const chat = await Chat.findById(item.chat);
          if (!chat) {
            item.status = "failed";
            await item.save();
            continue;
          }

          const msg = await Message.create({
            chat: chat._id,
            sender: item.sender,
            content: item.content,
            type: "text",
            readBy: [item.sender]
          });

          chat.lastMessage = msg._id;
          await chat.save();

          const populated = await msg.populate("sender", "name email avatar");

          io.to("chat:" + chat._id.toString()).emit("message:new", populated);
          io.to("chat:" + chat._id.toString()).emit("chat:updated", {
            chatId: chat._id.toString(),
            lastMessage: populated
          });

          item.status = "sent";
          item.sentAt = new Date();
          await item.save();

          io.to("user:" + item.sender.toString()).emit("scheduled:sent", {
            scheduledId: item._id.toString(),
            messageId: msg._id.toString()
          });
        } catch (err) {
          console.error("Failed to send scheduled item:", err.message);
          item.status = "failed";
          await item.save();
        }
      }
    } catch (err) {
      console.error("Scheduler error:", err.message);
    }
  });

  console.log("Scheduler started (checks every 20s)");
};
