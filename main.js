// ==========================
// 🧩 Імпорти UXP API
// ==========================
import { app } from "photoshop";
import { localFileSystem } from "uxp";

// ==========================
// 📦 Елементи інтерфейсу
// ==========================
const openFolderBtn = document.getElementById("openFolderBtn");
const refreshBtn = document.getElementById("refreshBtn");
const fileTreeEl = document.getElementById("fileTree");
const currentPathEl = document.getElementById("currentPath");
const statusBar = document.getElementById("statusBar");

// Ключ для збереження дозволу на теку
const LS_KEY = "xxkotfejxx:lastFolderToken";

// Деякі глобальні змінні
let rootFolder = null;   // handle до вибраної теки
let cachedTree = null;   // кеш структури

// Формати, які можемо відкривати у Photoshop
const OPENABLE = new Set([".psd", ".psb", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".webp"]);

// ==========================
// 🚀 Ініціалізація
// ==========================
document.addEventListener("DOMContentLoaded", init);

async function init() {
  setStatus("Ініціалізація плагіна...");
  // спробуємо відновити останню теку
  const token = localStorage.getItem(LS_KEY);
  if (token) {
    try {
      const folder = await localFileSystem.getEntryForPersistentToken(token);
      if (folder) {
        rootFolder = folder;
        await buildAndRenderTree();
        setStatus("Готово");
        return;
      }
    } catch (e) {
      console.warn("Не вдалося відновити теку:", e);
    }
  }
  setStatus("Оберіть теку, щоб почати.");
}

// ==========================
// 📁 Вибір теки
// ==========================
openFolderBtn.addEventListener("click", async () => {
  try {
    const folder = await localFileSystem.getFolder();
    if (!folder) return;
    rootFolder = folder;
    persistFolderToken(folder);
    await buildAndRenderTree();
  } catch (err) {
    setStatus("Помилка вибору теки: " + err.message);
  }
});

// Оновити список
refreshBtn.addEventListener("click", async () => {
  if (!rootFolder) return setStatus("Спочатку оберіть теку");
  await buildAndRenderTree(true);
});

// ==========================
// 🧠 Збереження дозволу
// ==========================
function persistFolderToken(folder) {
  if (!folder || !folder.createPersistentToken) return;
  folder.createPersistentToken()
    .then(token => localStorage.setItem(LS_KEY, token))
    .catch(() => {});
}

// ==========================
// 📚 Побудова дерева
// ==========================
async function buildAndRenderTree(force = false) {
  if (!rootFolder) return;
  currentPathEl.textContent = `📁 ${rootFolder.name}`;
  setStatus("Зчитую файли...");

  cachedTree = await readFolderRecursive(rootFolder);
  renderTree(cachedTree, fileTreeEl);

  setStatus("Готово");
}

async function readFolderRecursive(folder) {
  const entries = await folder.getEntries();
  const nodes = [];

  for (const entry of entries) {
    if (entry.isFolder) {
      nodes.push({
        type: "folder",
        name: entry.name,
        handle: entry,
        children: await readFolderRecursive(entry),
      });
    } else {
      nodes.push({
        type: "file",
        name: entry.name,
        handle: entry,
        size: entry.size ?? 0,
      });
    }
  }

  // сортуємо: папки зверху
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return nodes;
}

// ==========================
// 🧩 Рендер дерева
// ==========================
function renderTree(tree, container) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "children";
  container.appendChild(wrapper);

  for (const node of tree) {
    if (node.type === "folder") {
      wrapper.appendChild(renderFolderNode(node));
    } else {
      wrapper.appendChild(renderFileNode(node));
    }
  }
}

// Фолдер
function renderFolderNode(node) {
  const wrapper = document.createElement("div");

  const header = document.createElement("div");
  header.className = "node folder";
  const chev = document.createElement("span");
  chev.className = "chev";
  chev.textContent = "▶";
  const icon = document.createElement("span");
  icon.className = "icon";
  icon.textContent = "📁";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = node.name;

  header.append(chev, icon, name);
  wrapper.appendChild(header);

  const children = document.createElement("div");
  children.className = "children hidden";
  wrapper.appendChild(children);

  // Рендеримо дочірні
  for (const child of node.children) {
    children.appendChild(child.type === "folder" ? renderFolderNode(child) : renderFileNode(child));
  }

  // Перемикання відкриття/закриття
  header.addEventListener("click", () => {
    const isHidden = children.classList.contains("hidden");
    children.classList.toggle("hidden");
    chev.textContent = isHidden ? "▼" : "▶";
  });

  return wrapper;
}

// Файл
function renderFileNode(node) {
  const row = document.createElement("div");
  row.className = "node file";

  const spacer = document.createElement("span");
  spacer.className = "chev";
  spacer.textContent = " ";
  const icon = document.createElement("span");
  icon.className = "icon";
  icon.textContent = pickFileEmoji(node.name);
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = node.name;
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = humanSize(node.size);

  row.append(spacer, icon, name, meta);

  row.addEventListener("click", async () => {
    try {
      await openFileInPhotoshop(node);
    } catch (e) {
      setStatus("Не вдалося відкрити: " + e.message);
    }
  });

  return row;
}

// ==========================
// 🖼️ Відкриття файлів
// ==========================
async function openFileInPhotoshop(node) {
  if (node.type !== "file") return;

  const ext = extname(node.name);
  if (!OPENABLE.has(ext)) {
    return setStatus(`Формат "${ext}" не підтримується.`);
  }

  setStatus(`Відкриваю ${node.name}...`);
  await app.open(node.handle);
  setStatus(`✅ Відкрито: ${node.name}`);
}

// ==========================
// 🧮 Допоміжні утиліти
// ==========================
function extname(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function humanSize(bytes = 0) {
  if (!bytes || bytes < 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${u[i]}`;
}

function pickFileEmoji(name) {
  const e = extname(name);
  if (e === ".psd" || e === ".psb") return "🅿️";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".tif", ".tiff", ".bmp"].includes(e)) return "🖼️";
  if ([".json", ".yml", ".yaml", ".xml", ".txt", ".md"].includes(e)) return "📄";
  return "📦";
}

function setStatus(text) {
  statusBar.textContent = text;
}
