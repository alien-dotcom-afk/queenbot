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
├── index.js             # Point d’entrée principal
├── package.json
├── .env                 # Config (non versionné)
├── .env.example         # Modèle pour créer son propre .env
├── .gitignore
│
└── src/
    ├── commands/        # Commandes du bot (si existant)
    └── data/
        ├── users.json
        ├── products.json
        ├── orders.json
        └── logs.json
```

---

## ⚙️ Installation

### 1️⃣ Cloner le repo

```bash
git clone https://github.com/ton-utilisateur/queenbot.git
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
