const express = require("express");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const PORT = process.env.PORT || 3000;

const visitors = {};
const messageMap = {};

app.post("/api/send", async (req, res) => {
  const { visitorId, name, message } = req.body;

  if (!visitorId || !message) {
    return res.status(400).json({ ok: false });
  }

  visitors[visitorId] = visitors[visitorId] || [];
  visitors[visitorId].push({ from: "visitor", text: message });

  const text =
`📩 New Website Message

👤 Name: ${name || "No name"}
🆔 Visitor ID: ${visitorId}

💬 Message:
${message}

Reply to this Telegram message to answer visitor.`;

  const tg = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: ADMIN_CHAT_ID,
    text
  });

  messageMap[tg.data.result.message_id] = visitorId;

  res.json({ ok: true });
});

app.post("/telegram-webhook", (req, res) => {
  const msg = req.body.message;

  if (msg && msg.reply_to_message && msg.text) {
    const replyMsgId = msg.reply_to_message.message_id;
    const visitorId = messageMap[replyMsgId];

    if (visitorId) {
      visitors[visitorId] = visitors[visitorId] || [];
      visitors[visitorId].push({ from: "admin", text: msg.text });
    }
  }

  res.sendStatus(200);
});

app.get("/api/messages/:visitorId", (req, res) => {
  res.json(visitors[req.params.visitorId] || []);
});

app.get("/set-webhook", async (req, res) => {
  const url = `${req.protocol}://${req.get("host")}/telegram-webhook`;

  const result = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${url}`);

  res.json(result.data);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
