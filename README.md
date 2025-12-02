# 📦 QueenBot

QueenBot est un bot Telegram développé en **Node.js**, utilisant la librairie **node-telegram-bot-api**.
Il gère différentes données (produits, utilisateurs, commandes, logs) stockées dans `src/data/`.

---

## 🚀 Fonctionnalités

* Chargement automatique des variables d’environnement via **dotenv**
* Architecture simple en **Node.js (CommonJS)**
* Gestion des données locales dans `src/data/*.json`
* Script de démarrage rapide
* Version de développement avec **nodemon**

---

## 📁 Structure du projet

```
queenbot/
│
├── .env                   # Variables d’environnement
├── index.js               # Entrée principale
├── package-lock.json
├── package.json
│
└── src/
    ├── bot.js             # Initialisation du bot Telegram
    │
    ├── config/
    │   └── crypto.js      # Chiffrement / déchiffrement
    │
    ├── data/              # Données locales (ignorées par Git)
    │   ├── logs.json
    │   ├── orders.json
    │   ├── products.json
    │   └── users.json
    │
    ├── handlers/          # Gestion des interactions Telegram
    │   ├── admin.js
    │   ├── callbacks.js
    │   ├── messages.js
    │   └── start.js
    │
    └── utils/             # Fonctions utilitaires
        ├── explorer.js
        └── files.js
```

---

## ⚙️ Installation

### 1️⃣ Cloner le repo

```bash
git clone https://github.com/alien-dotcom-afk/queenbot.git
cd queenbot
```

### 2️⃣ Installer les dépendances

```bash
npm install
```

### 3️⃣ Configurer les variables d’environnement

Crée un fichier `.env` à partir du modèle :

```bash
cp .env.example .env
```

Puis remplis-le avec ton **TELEGRAM_TOKEN** :

```
TELEGRAM_TOKEN=your_telegram_bot_token_here
```

---

## ▶️ Lancer le bot

### Mode normal

```bash
npm start
```

### Mode développement (auto-reload)

```bash
npm run dev
```

---

## 📜 Scripts disponibles

| Script  | Commande           | Description              |
| ------- | ------------------ | ------------------------ |
| `start` | `node index.js`    | Lancer le bot            |
| `dev`   | `nodemon index.js` | Rechargement automatique |

---

## 🛡️ Fichiers ignorés

Le fichier `.gitignore` exclut :

* `.env`
* `node_modules`
* `src/data/*` (toutes les données sensibles)
* logs & fichiers système

---

## 🤝 Contribution

Les pull requests sont les bienvenues.
Assure-toi simplement de :

* garder le code propre
* ne jamais commit `.env` ou `src/data/*.json`

---

## 📄 Licence

Projet privé – usage personnel.
