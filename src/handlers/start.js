const path = require("path");
const { load, save, append } = require("../utils/files");

module.exports = (bot) => {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || "inconnu";

    const usersFile = path.join(__dirname, "..", "data", "users.json");
    const logsFile = path.join(__dirname, "..", "data", "logs.json");
    const productsFile = path.join(__dirname, "..", "data", "products.json");

    let users = load(usersFile, []);

    if (!users.find(u => String(u.chatId) === String(chatId))) {
      const userObj = {
        chatId,
        username,
        first_name: msg.from.first_name || "",
        last_name: msg.from.last_name || "",
        date: new Date().toISOString()
      };
      users.push(userObj);
      save(usersFile, users);

      append(logsFile, {
        type: "user_registered",
        chatId,
        username,
        date: userObj.date
      });
    } else {
      append(logsFile, {
        type: "user_start_again",
        chatId,
        username,
        date: new Date().toISOString()
      });
    }

    const products = load(productsFile, []);

    const keyboard = products.map(p => [
      {
        text: `${p.name} — ${p.price}€ (${p.stock} en stock)`,
        callback_data: "menu_buy_" + p.id
      }
    ]);

    bot.sendClean(chatId, "Queens Log\n\nSélectionnez un produit :", {
      reply_markup: { inline_keyboard: keyboard }
    });
  });
};
