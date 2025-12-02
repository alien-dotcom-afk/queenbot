const path = require("path");
const { load, save, append } = require("../utils/files");
const CRYPTO = require("../config/crypto");

module.exports = (bot) => {
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    bot.answerCallbackQuery(query.id).catch(() => {});

    if (String(chatId) === String(process.env.CHAT_ID)) return;

    const productsFile = path.join(__dirname, "..", "data", "products.json");
    const ordersFile   = path.join(__dirname, "..", "data", "orders.json");
    const logsFile     = path.join(__dirname, "..", "data", "logs.json");

    let products = load(productsFile, []);
    let orders   = load(ordersFile, []);

    if (data === "menu_back") {
      return bot.sendClean(chatId, "Sélectionnez un produit :", {
        reply_markup: {
          inline_keyboard: products.map(p => [{
            text: p.name + " — " + p.price + "€ (" + p.stock + " en stock)",
            callback_data: "menu_buy_" + p.id
          }])
        }
      });
    }

    if (data.startsWith("menu_buy_")) {
      const id = data.split("_")[2];
      const product = products.find(p => p.id === id);

      if (!product || product.stock <= 0) {
        append(logsFile, {
          type: "order_error_stock",
          productId: id,
          chatId,
          date: new Date().toISOString()
        });
        return bot.answerCallbackQuery(query.id, { text: "Rupture de stock" });
      }

      const orderId = Date.now().toString();

      const order = {
        id: orderId,
        chatId,
        username: query.from.username || null,
        product: product.name,
        price: product.price,
        status: "pending_confirm",
        date: new Date().toISOString()
      };

      orders.push(order);
      save(ordersFile, orders);

      append(logsFile, {
        type: "order_created",
        orderId,
        chatId,
        username: order.username,
        product: order.product,
        price: order.price,
        date: order.date
      });

      return bot.sendClean(
        chatId,
        "Commande en attente de confirmation\n\n" +
        "Produit : " + product.name + "\n" +
        "Prix : " + product.price + "€",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Confirmer", callback_data: "confirm_" + orderId }],
              [{ text: "Retour", callback_data: "menu_back" }]
            ]
          }
        }
      );
    }

    if (data.startsWith("confirm_")) {
      const id = data.split("_")[1];
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const product = products.find(p => p.name === order.product);

      if (!product || product.stock <= 0) {
        append(logsFile, {
          type: "order_confirm_failed_stock",
          orderId: id,
          chatId,
          product: order.product,
          date: new Date().toISOString()
        });
        return bot.sendClean(chatId, "Rupture entre-temps.");
      }

      product.stock--;
      save(productsFile, products);

      order.status = "pending_payment";
      save(ordersFile, orders);

      append(logsFile, {
        type: "order_confirmed",
        orderId: id,
        chatId,
        product: order.product,
        price: order.price,
        date: new Date().toISOString()
      });

      return bot.sendClean(
        chatId,
        "Choisissez la crypto pour votre paiement :",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "ETH",          callback_data: "pay_ETH_"  + id },
                { text: "USDT (ERC20)", callback_data: "pay_USDT_" + id }
              ],
              [
                { text: "SOL", callback_data: "pay_SOL_" + id },
                { text: "LTC", callback_data: "pay_LTC_" + id }
              ],
              [{ text: "Retour", callback_data: "menu_back" }]
            ]
          }
        }
      );
    }

    if (data.startsWith("pay_")) {
      const parts = data.split("_");
      const crypto = parts[1];
      const orderId = parts[2];

      const orders = load(ordersFile, []);
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      order.crypto = crypto;
      save(ordersFile, orders);

      const address = CRYPTO[crypto].address;

      append(logsFile, {
        type: "crypto_selected",
        orderId,
        chatId,
        crypto,
        address,
        date: new Date().toISOString()
      });

      return bot.sendClean(
        chatId,
        "💸 Paiement en " + crypto + "\n\n" +
        "Adresse :\n`" + address + "`\n\n" +
        "⚠️ USDT = Réseau ERC20 uniquement.\n\n" +
        "➡️ Envoie ton TX ID ici dès que le paiement est effectué.",
        { parse_mode: "Markdown" }
      );
    }
  });
};
azureuser@vps-debian:~/queenbot/src$ ls handlers
admin.js  callbacks.js  messages.js  start.js
azureuser@vps-debian:~/queenbot/src$ cat handlers/messages.js
const path = require("path");
const { load, save, append } = require("../utils/files");
const { explorerLink } = require("../utils/explorer");

module.exports = (bot) => {
  bot.on("message", (msg) => {
    if (String(msg.chat.id) === String(process.env.CHAT_ID)) return;
    if (!msg.text) return;
    if (msg.text.startsWith("/")) return;

    const chatId = msg.chat.id;
    const ordersFile = path.join(__dirname, "..", "data", "orders.json");
    const logsFile = path.join(__dirname, "..", "data", "logs.json");

    let orders = load(ordersFile, []);
    const order = orders.find(o => o.chatId === chatId && o.status === "pending_payment");
    if (!order) return;

    if (msg.text.length < 8) {
      append(logsFile, {
        type: "txid_invalid",
        chatId,
        orderId: order.id,
        txId: msg.text,
        crypto: order.crypto,
        date: new Date().toISOString()
      });

      return bot.sendClean(chatId, "TX ID invalide. Merci de copier/coller le TX ID complet.");
    }

    order.txId = msg.text.trim();
    order.status = "payment_submitted";
    save(ordersFile, orders);

    const link = explorerLink(order.crypto, order.txId);

    append(logsFile, {
      type: "txid_submitted",
      chatId,
      orderId: order.id,
      txId: order.txId,
      crypto: order.crypto,
      explorer: link,
      date: new Date().toISOString()
    });

    bot.sendClean(
      chatId,
      "Paiement envoyé.\n\n" +
      "Vérification : " + link + "\n\n" +
      "Ton paiement est en cours de validation.\n\n" +
      "USDT = ERC20 uniquement."
    );

    bot.sendMessage(
      process.env.CHAT_ID,
      "Nouvelle commande\n\n" +
      "Utilisateur : @" + (order.username || "inconnu") + "\n" +
      "Produit : " + order.product + "\n" +
      "Crypto : " + order.crypto + "\n" +
      "TX : " + order.txId
    );
  });
};
