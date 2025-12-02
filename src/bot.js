const TelegramBot = require("node-telegram-bot-api");
const startHandler = require("./handlers/start");
const callbackHandler = require("./handlers/callbacks");
const messageHandler = require("./handlers/messages");
const adminHandler = require("./handlers/admin");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.lastMessage = {};

bot.cleanChat = (chatId) => {
  if (String(chatId) === String(process.env.CHAT_ID)) return;
  if (bot.lastMessage[chatId]) {
    bot.deleteMessage(chatId, bot.lastMessage[chatId]).catch(() => {});
  }
};

bot.sendClean = async (chatId, text, options = {}) => {
  if (String(chatId) !== String(process.env.CHAT_ID)) {
    bot.cleanChat(chatId);
  }
  try {
    const sent = await bot.sendMessage(chatId, text, options);
    bot.lastMessage[chatId] = sent.message_id;
  } catch (e) {}
};

startHandler(bot);
callbackHandler(bot);
messageHandler(bot);
adminHandler(bot);

module.exports = bot;
