const path = require("path");
const { load, save, append } = require("../utils/files");

module.exports = (bot) => {
  const productsFile = path.join(__dirname, "..", "data", "products.json");
  const ordersFile   = path.join(__dirname, "..", "data", "orders.json");
  const usersFile    = path.join(__dirname, "..", "data", "users.json");
  const logsFile     = path.join(__dirname, "..", "data", "logs.json");

  bot.adminState = bot.adminState || {};

  const isAdminChat = (id) => String(id) === String(process.env.CHAT_ID);

  /* ================================
       UI ADMIN PRINCIPALE
  ================================== */

  function sendAdminHome(chatId, messageId = null) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📦 Commandes", callback_data: "admin_orders" }],
          [{ text: "📋 Produits", callback_data: "admin_products" }],
          [
            { text: "➕ Ajouter produit", callback_data: "admin_add_product" },
            { text: "🗑 Supprimer produit", callback_data: "admin_delete_product" }
          ],
          [{ text: "📦 Stock", callback_data: "admin_stock" }],
          [{ text: "🗑 Vider commandes", callback_data: "admin_clear" }],
          [{ text: "💬 Répondre utilisateur", callback_data: "admin_reply" }],
          [{ text: "📢 Broadcast", callback_data: "admin_broadcast_help" }],
          [{ text: "❓ Aide", callback_data: "admin_help" }]
        ]
      }
    };

    if (messageId) {
      bot.editMessageText("🛠 Panneau Admin", {
        chat_id: chatId,
        message_id: messageId,
        ...options
      }).catch(() => {
        bot.sendMessage(chatId, "🛠 Panneau Admin", options);
      });
    } else {
      bot.sendClean(chatId, "🛠 Panneau Admin", options);
    }
  }

  /* ================================
       /admin
  ================================== */

  bot.onText(/^\/admin$/, (msg) => {
    if (!isAdminChat(msg.chat.id)) return;

    append(logsFile, {
      type: "admin_open_panel",
      adminId: msg.chat.id,
      date: new Date().toISOString()
    });

    sendAdminHome(msg.chat.id);
  });

  /* ================================
       /stock <id> <qty>
  ================================== */

  bot.onText(/^\/stock (\d+) (\d+)$/, (msg, match) => {
    const adminId = msg.chat.id;
    if (!isAdminChat(adminId)) return;

    const productId = match[1];
    const qty       = Number(match[2]);

    const products = load(productsFile, []);
    const product  = products.find(p => p.id === productId);

    if (!product) {
      return bot.sendMessage(adminId, "❌ ID produit introuvable : " + productId);
    }

    product.stock = qty;
    save(productsFile, products);

    append(logsFile, {
      type: "admin_stock_update",
      adminId,
      productId,
      newStock: qty,
      date: new Date().toISOString()
    });

    bot.sendMessage(adminId, `✔ Stock mis à jour\n${product.name} → ${qty}`);
  });

  /* ================================
       /addproduct <nom> <prix> <stock>
  ================================== */

  bot.onText(/^\/addproduct (.+)/s, (msg, match) => {
    const adminId = msg.chat.id;
    if (!isAdminChat(adminId)) return;

    const arg = match[1].trim();
    const parts = arg.split(/\s+/);

    if (parts.length < 3) {
      return bot.sendMessage(
        adminId,
        "Usage : /addproduct <nom> <prix> <stock>\n\n" +
        "Exemple : /addproduct \"Netflix Premium\" 20 5"
      );
    }

    const stock = Number(parts[parts.length - 1]);
    const price = Number(parts[parts.length - 2]);
    const name = parts.slice(0, -2).join(" ");

    if (!name || isNaN(price) || isNaN(stock)) {
      return bot.sendMessage(adminId, "❌ Format invalide. Prix et stock doivent être des nombres.");
    }

    const products = load(productsFile, []);
    const newId = String(Math.max(0, ...products.map(p => Number(p.id))) + 1);

    const newProduct = {
      id: newId,
      name,
      price,
      stock
    };

    products.push(newProduct);
    save(productsFile, products);

    append(logsFile, {
      type: "admin_add_product_command",
      adminId,
      product: newProduct,
      date: new Date().toISOString()
    });

    bot.sendMessage(
      adminId,
      `✅ Produit ajouté\n\n` +
      `ID : ${newId}\n` +
      `Nom : ${name}\n` +
      `Prix : ${price}€\n` +
      `Stock : ${stock}`
    );
  });

  /* ================================
       /deleteproduct <id>
  ================================== */

  bot.onText(/^\/deleteproduct (\d+)$/, (msg, match) => {
    const adminId = msg.chat.id;
    if (!isAdminChat(adminId)) return;

    const productId = match[1];

    let products = load(productsFile, []);
    const product = products.find(p => p.id === productId);

    if (!product) {
      return bot.sendMessage(adminId, "❌ ID produit introuvable : " + productId);
    }

    products = products.filter(p => p.id !== productId);
    save(productsFile, products);

    append(logsFile, {
      type: "admin_delete_product_command",
      adminId,
      productId,
      productName: product.name,
      date: new Date().toISOString()
    });

    bot.sendMessage(
      adminId,
      `✅ Produit supprimé\n\n` +
      `ID : ${productId}\n` +
      `Nom : ${product.name}`
    );
  });

  /* ================================
       /broadcast
  ================================== */

  bot.onText(/^\/broadcast (.+)/s, (msg, match) => {
    const adminId = msg.chat.id;
    if (!isAdminChat(adminId)) return;

    const arg = match[1].trim();
    const users = load(usersFile, []);

    if (!arg) return bot.sendMessage(adminId, "Usage : /broadcast <message>");

    const parts   = arg.split(" ");
    const maybeId = parts[0];

    if (/^\d+$/.test(maybeId) && parts.length > 1) {
      const targetId = Number(maybeId);
      const message  = parts.slice(1).join(" ");

      bot.sendMessage(targetId, message).catch(() => {});

      append(logsFile, {
        type: "admin_broadcast_one",
        adminId,
        targetId,
        message,
        date: new Date().toISOString()
      });

      return bot.sendMessage(adminId, "Message envoyé à " + targetId);
    }

    const message = arg;
    users.forEach((u) => bot.sendMessage(u.chatId, message).catch(() => {}));

    append(logsFile, {
      type: "admin_broadcast_all",
      adminId,
      count: users.length,
      message,
      date: new Date().toISOString()
    });

    bot.sendMessage(adminId, "Message envoyé à " + users.length + " utilisateur(s).");
  });

  /* ================================
         CALLBACK ADMIN
  ================================== */

  bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    bot.answerCallbackQuery(query.id).catch(() => {});

    if (!isAdminChat(chatId)) return;

    const data = query.data;

    /* ----- HOME ----- */
    if (data === "admin_home") {
      delete bot.adminState[chatId];
      return sendAdminHome(chatId, messageId);
    }

    /* ----- AIDE ----- */
    if (data === "admin_help") {
      return bot.editMessageText(
        "📘 Aide Admin\n\n" +
        "/admin — panneau admin\n" +
        "/stock <id> <qty> — modifier stock\n" +
        "/addproduct <nom> <prix> <stock> — ajouter produit\n" +
        "/deleteproduct <id> — supprimer produit\n" +
        "/broadcast <message> — message global",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }
      ).catch(() => {});
    }

    /* ----- BROADCAST HELP ----- */
    if (data === "admin_broadcast_help") {
      return bot.editMessageText(
        "📢 Broadcast\n\n/broadcast Bonjour\n/broadcast 123 Bonjour 👋",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }
      ).catch(() => {});
    }

    /* ----- PRODUITS ----- */
    if (data === "admin_products") {
      const products = load(productsFile, []);
      let txt = "📋 Produits :\n\n";

      if (products.length === 0) {
        txt += "Aucun produit.\n";
      } else {
        products.forEach(p => {
          txt += `ID: ${p.id}\nNom: ${p.name}\nPrix: ${p.price}€\nStock: ${p.stock}\n\n`;
        });
      }

      return bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
      }).catch(() => {});
    }

    /* ----- AJOUTER PRODUIT (MODE INTERACTIF) ----- */
    if (data === "admin_add_product") {
      bot.adminState[chatId] = {
        mode: "add_product",
        step: "name",
        startedAt: Date.now()
      };

      return bot.editMessageText(
        "➕ Ajouter un produit\n\n" +
        "Étape 1/3 : Envoie le nom du produit",
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Annuler", callback_data: "admin_home" }]]
          }
        }
      ).catch(() => {});
    }

    /* ----- SUPPRIMER PRODUIT (LISTE) ----- */
    if (data === "admin_delete_product") {
      const products = load(productsFile, []);

      if (products.length === 0) {
        return bot.editMessageText("Aucun produit à supprimer.", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }).catch(() => {});
      }

      const list = products.map(p => [{
        text: `${p.name} (ID ${p.id}) - ${p.price}€`,
        callback_data: "admin_delete_confirm_" + p.id
      }]);

      return bot.editMessageText("🗑 Choisissez le produit à supprimer :", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [...list, [{ text: "◀️ Retour", callback_data: "admin_home" }]]
        }
      }).catch(() => {});
    }

    /* ----- CONFIRMATION SUPPRESSION ----- */
    if (data.startsWith("admin_delete_confirm_")) {
      const productId = data.split("_")[3];
      const products = load(productsFile, []);
      const product = products.find(p => p.id === productId);

      if (!product) {
        return bot.editMessageText("❌ Produit introuvable.", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }).catch(() => {});
      }

      return bot.editMessageText(
        `⚠️ Confirmer la suppression ?\n\n` +
        `ID : ${product.id}\n` +
        `Nom : ${product.name}\n` +
        `Prix : ${product.price}€\n` +
        `Stock : ${product.stock}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Oui, supprimer", callback_data: "admin_delete_exec_" + productId }],
              [{ text: "◀️ Non, retour", callback_data: "admin_delete_product" }]
            ]
          }
        }
      ).catch(() => {});
    }

    /* ----- EXÉCUTION SUPPRESSION ----- */
    if (data.startsWith("admin_delete_exec_")) {
      const productId = data.split("_")[3];

      let products = load(productsFile, []);
      const product = products.find(p => p.id === productId);

      if (!product) {
        return bot.editMessageText("❌ Produit introuvable.", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }).catch(() => {});
      }

      products = products.filter(p => p.id !== productId);
      save(productsFile, products);

      append(logsFile, {
        type: "admin_delete_product",
        adminId: chatId,
        productId,
        productName: product.name,
        date: new Date().toISOString()
      });

      return bot.editMessageText(
        `✅ Produit supprimé avec succès\n\n` +
        `ID : ${productId}\n` +
        `Nom : ${product.name}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }
      ).catch(() => {});
    }

    /* ----- COMMANDES ----- */
    if (data === "admin_orders") {
      const orders = load(ordersFile, []);
      if (orders.length === 0) {
        return bot.editMessageText("Aucune commande.", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }).catch(() => {});
      }

      const list = orders.map(o => [{
        text: `#${o.id} — ${o.product} (${o.status})`,
        callback_data: "admin_order_" + o.id
      }]);

      return bot.editMessageText("📦 Commandes :", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [...list, [{ text: "◀️ Retour", callback_data: "admin_home" }]] }
      }).catch(() => {});
    }

    /* ----- DÉTAIL D'UNE COMMANDE ----- */
    if (data.startsWith("admin_order_")) {
      const id     = data.split("_")[2];
      const orders = load(ordersFile, []);
      const o      = orders.find(x => x.id === id);
      if (!o) return;

      let txt =
        `📦 Commande #${o.id}\n\n` +
        `👤 @${o.username || "inconnu"} (${o.chatId})\n` +
        `📌 ${o.product}\n` +
        `💰 ${o.price}€\n` +
        `📍 ${o.status}`;

      if (o.crypto) txt += `\n🔗 ${o.crypto}`;
      if (o.txId)   txt += `\n📨 ${o.txId}`;

      return bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "✔ Valider paiement", callback_data: "admin_ok_" + id }],
            [{ text: "❌ Annuler", callback_data: "admin_cancel_" + id }],
            [{ text: "💬 Répondre", callback_data: "admin_msg_" + o.chatId }],
            [{ text: "OK reçu", callback_data: "admin_quick_" + o.chatId + "_OK" }],
            [{ text: "Expédiée", callback_data: "admin_quick_" + o.chatId + "_EXPEDIE" }],
            [{ text: "◀️ Retour", callback_data: "admin_orders" }]
          ]
        }
      }).catch(() => {});
    }

    /* ----- MESSAGE RAPIDE ----- */
    if (data.startsWith("admin_quick_")) {
      const userChatId = data.split("_")[2];
      const type       = data.split("_")[3];

      const msg =
        type === "OK"
          ? "Votre commande a bien été notée."
          : type === "EXPEDIE"
          ? "Votre commande a été expédiée."
          : "";

      if (!msg) return;

      bot.sendMessage(userChatId, msg).catch(() => {});

      append(logsFile, {
        type: "admin_quick_message",
        adminId: chatId,
        target: userChatId,
        messageType: type,
        date: new Date().toISOString()
      });

      return bot.editMessageText("✅ Message envoyé", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
      }).catch(() => {});
    }

    /* ----- VALIDER COMMANDE ----- */
    if (data.startsWith("admin_ok_")) {
      const id     = data.split("_")[2];
      const orders = load(ordersFile, []);
      const o      = orders.find(x => x.id === id);
      if (!o) return;

      o.status = "paid";
      save(ordersFile, orders);

      bot.sendMessage(o.chatId, "Votre paiement a été validé ✔").catch(() => {});

      append(logsFile, {
        type: "admin_validate_payment",
        adminId: chatId,
        orderId: id,
        chatId: o.chatId,
        date: new Date().toISOString()
      });

      return bot.editMessageText("✅ Commande validée", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_orders" }]] }
      }).catch(() => {});
    }

    /* ----- ANNULER COMMANDE ----- */
    if (data.startsWith("admin_cancel_")) {
      const id = data.split("_")[2];

      let orders = load(ordersFile, []);
      const o = orders.find(x => x.id === id);

      if (o) bot.sendMessage(o.chatId, "Votre commande a été annulée.").catch(() => {});

      orders = orders.filter(x => x.id !== id);
      save(ordersFile, orders);

      append(logsFile, {
        type: "admin_cancel_order",
        adminId: chatId,
        orderId: id,
        chatId: o ? o.chatId : null,
        date: new Date().toISOString()
      });

      return bot.editMessageText("✅ Commande annulée", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_orders" }]] }
      }).catch(() => {});
    }

    /* ----- STOCK ----- */
    if (data === "admin_stock") {
      const products = load(productsFile, []);
      let txt = "📦 Stocks :\n\n";

      products.forEach(p => txt += `${p.name} (ID ${p.id}) : ${p.stock}\n`);

      return bot.editMessageText(txt, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
      }).catch(() => {});
    }

    /* ----- VIDER COMMANDES ----- */
    if (data === "admin_clear") {
      save(ordersFile, []);

      append(logsFile, {
        type: "admin_clear_orders",
        adminId: chatId,
        date: new Date().toISOString()
      });

      return bot.editMessageText("✅ Toutes les commandes ont été supprimées", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
      }).catch(() => {});
    }

    /* ----- RÉPONDRE UTILISATEUR (liste) ----- */
    if (data === "admin_reply") {
      const users = load(usersFile, []);

      if (users.length === 0) {
        return bot.editMessageText("Aucun utilisateur enregistré.", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]] }
        }).catch(() => {});
      }

      const list = users.map(u => [{
        text: u.username ? "@" + u.username : "User " + u.chatId,
        callback_data: "admin_msg_" + u.chatId
      }]);

      return bot.editMessageText("💬 Choisissez un utilisateur :", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [...list, [{ text: "◀️ Retour", callback_data: "admin_home" }]]
        }
      }).catch(() => {});
    }

    /* ----- DÉMARRER MODE RÉPONSE ----- */
    if (data.startsWith("admin_msg_")) {
      const userChatId = data.split("_")[2];

      const users = load(usersFile, []);
      const u = users.find(us => String(us.chatId) === String(userChatId));

      const label =
        u && u.username
          ? "@" + u.username
          : u
            ? [u.first_name, u.last_name].filter(Boolean).join(" ") || ("ID " + userChatId)
            : "ID " + userChatId;

      bot.adminState[chatId] = {
        mode: "reply",
        replyTo: userChatId,
        startedAt: Date.now()
      };

      append(logsFile, {
        type: "admin_start_reply",
        adminId: chatId,
        target: userChatId,
        date: new Date().toISOString()
      });

      return bot.editMessageText(
        `✏️ Répondre à ${label} (${userChatId})\n\nEnvoie ton message :`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Annuler", callback_data: "admin_home" }]]
          }
        }
      ).catch(() => {});
    }
  });

  /* ================================
         GESTION MESSAGES ADMIN
  ================================== */

  bot.on("message", (msg) => {
    const adminId = msg.chat.id;
    if (!isAdminChat(adminId)) return;

    const state = bot.adminState[adminId];
    if (!state) return;
    if (!msg.text || msg.text.startsWith("/")) return;

    /* ----- MODE RÉPONSE UTILISATEUR ----- */
    if (state.mode === "reply") {
      if (!state.replyTo) return;

      const target = state.replyTo;
      delete bot.adminState[adminId];

      const loadingMsg = bot.sendMessage(adminId, "⏳ Envoi en cours...");

      bot.sendMessage(target, msg.text)
        .then(() => {
          loadingMsg.then(m => bot.deleteMessage(adminId, m.message_id).catch(() => {}));

          append(logsFile, {
            type: "admin_reply_user",
            adminId,
            target,
            message: msg.text,
            date: new Date().toISOString()
          });

          bot.sendClean(adminId, "✅ Message envoyé avec succès", {
            reply_markup: {
              inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]]
            }
          });
        })
        .catch((err) => {
          loadingMsg.then(m => bot.deleteMessage(adminId, m.message_id).catch(() => {}));

          bot.sendMessage(
            adminId,
            "❌ Erreur d'envoi\n" +
            "L'utilisateur a peut-être bloqué le bot.\n\n" +
            "Erreur : " + err.message
          );
        });
      return;
    }

    /* ----- MODE AJOUT PRODUIT ----- */
    if (state.mode === "add_product") {
      const step = state.step;

      if (step === "name") {
        state.name = msg.text.trim();
        state.step = "price";

        return bot.sendClean(
          adminId,
          `✅ Nom : ${state.name}\n\n` +
          "Étape 2/3 : Envoie le prix (en €)",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "❌ Annuler", callback_data: "admin_home" }]]
            }
          }
        );
      }

      if (step === "price") {
        const price = Number(msg.text.trim());

        if (isNaN(price) || price <= 0) {
          return bot.sendMessage(adminId, "❌ Prix invalide. Envoie un nombre positif (ex: 15)");
        }

        state.price = price;
        state.step = "stock";

        return bot.sendClean(
          adminId,
          `✅ Nom : ${state.name}\n` +
          `✅ Prix : ${state.price}€\n\n` +
          "Étape 3/3 : Envoie le stock initial",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "❌ Annuler", callback_data: "admin_home" }]]
            }
          }
        );
      }

      if (step === "stock") {
        const stock = Number(msg.text.trim());

        if (isNaN(stock) || stock < 0) {
          return bot.sendMessage(adminId, "❌ Stock invalide. Envoie un nombre positif (ex: 10)");
        }

        const products = load(productsFile, []);
        const newId = String(Math.max(0, ...products.map(p => Number(p.id))) + 1);

        const newProduct = {
          id: newId,
          name: state.name,
          price: state.price,
          stock
        };

        products.push(newProduct);
        save(productsFile, products);

        append(logsFile, {
          type: "admin_add_product",
          adminId,
          product: newProduct,
          date: new Date().toISOString()
        });

        delete bot.adminState[adminId];

        return bot.sendClean(
          adminId,
          `✅ Produit ajouté avec succès !\n\n` +
          `📦 ID : ${newId}\n` +
          `📝 Nom : ${state.name}\n` +
          `💰 Prix : ${state.price}€\n` +
          `📊 Stock : ${stock}`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "◀️ Retour", callback_data: "admin_home" }]]
            }
          }
        );
      }
    }
  });
};
azureuser@vps-debian:~/queenbot/src$ cat handlers/admin.jsls admin
cat: handlers/admin.jsls: No such file or directory
cat: admin: No such file or directory
azureuser@vps-debian:~/queenbot/src$ ls handlers
admin.js  callbacks.js  messages.js  start.js
azureuser@vps-debian:~/queenbot/src$ cat handlers/callbacks.js
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
