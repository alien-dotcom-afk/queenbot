const fs = require("fs");

function load(file, defaultValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }

  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    // Si le fichier est corrompu, on renvoie la valeur par défaut
    return defaultValue;
  }
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Ajoute une entrée à un tableau JSON (logs, etc.)
function append(file, entry) {
  const current = load(file, []);
  current.push(entry);
  save(file, current);
}

module.exports = { load, save, append };
