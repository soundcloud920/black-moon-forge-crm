import "dotenv/config";
import http from "node:http";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { Telegraf } from "telegraf";
import { appendEvent, readEvents } from "./store.js";

const port = Number(process.env.PORT || 8787);
const streamClients = new Set();

await startDiscord();
await startTelegram();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, { ok: true, at: new Date().toISOString() });
  }

  if (req.method === "GET" && url.pathname === "/events") {
    return sendJson(res, { events: await readEvents() });
  }

  if (req.method === "GET" && url.pathname === "/stream") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*",
    });
    res.write("\n");
    streamClients.add(res);
    req.on("close", () => streamClients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/events") {
    const body = await readBody(req);
    const event = await recordEvent(JSON.parse(body || "{}"));
    return sendJson(res, { event });
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`Activity bot server listening on http://127.0.0.1:${port}`);
});

async function startDiscord() {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    await recordEvent({
      platform: "discord",
      chat: message.channel?.name || message.channelId,
      authorExternalId: message.author.id,
      authorName: message.author.globalName || message.author.username,
      text: message.content,
      rawType: "messageCreate",
      at: message.createdAt?.toISOString() || new Date().toISOString(),
    });
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

async function startTelegram() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  bot.on("message", async (ctx) => {
    const message = ctx.message;
    const from = message.from || {};
    const chat = message.chat || {};
    await recordEvent({
      platform: "telegram",
      chat: chat.title || chat.username || String(chat.id || ""),
      authorExternalId: String(from.id || ""),
      authorName: [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "",
      text: message.text || message.caption || "",
      rawType: "message",
      at: new Date((message.date || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    });
  });

  await bot.launch();
}

async function recordEvent(event) {
  const saved = await appendEvent(event);
  broadcast(saved);
  return saved;
}

function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of streamClients) {
    client.write(data);
  }
}

function sendJson(res, body) {
  res.writeHead(200, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
