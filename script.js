// ===================================================
// 🔹 Photoshop Project Explorer — з підтримкою Smart Objects
// ===================================================

// Імпорт системних API
const uxp = require("uxp");
const localFileSystem = uxp.storage.localFileSystem;
const entrypoints = uxp.entrypoints;

// Елементи інтерфейсу
const openFolderBtn = document.getElementById("openFolderBtn");
const refreshBtn = document.getElementById("refreshBtn");
const fileTree = document.getElementById("fileTree");
const currentPath = document.getElementById("currentPath");
const statusBar = document.getElementById("statusBar");

let currentFolder = null;

// 🔸 Підтримувані розширення Photoshop
const SUPPORTED_EXTENSIONS = [
  "psd", "psb", "png", "jpg", "jpeg", "tif", "tiff",
  "gif", "bmp", "tga", "svg", "pdf", "heic", "webp"
];

// ===================================================
// 🔹 Вибір теки
// ===================================================
openFolderBtn.addEventListener("click", async () => {
  try {
    currentFolder = await localFileSystem.getFolder({ allowSystem: true });
    if (!currentFolder) {
      statusBar.textContent = "🚫 Теку не вибрано";
      return;
    }

    currentPath.textContent = currentFolder.nativePath || "(невідомо)";
    await renderTree(currentFolder, fileTree);
  } catch (err) {
    console.error("Помилка при виборі теки:", err);
    statusBar.textContent = "❌ Помилка при виборі теки";
  }
});

// ===================================================
// 🔹 Оновлення дерева
// ===================================================
refreshBtn.addEventListener("click", () => {
  if (currentFolder) renderTree(currentFolder, fileTree);
});

// ===================================================
// 🔹 Рекурсивне побудування дерева
// ===================================================
async function renderTree(folder, container) {
  container.innerHTML = "";
  statusBar.textContent = "Завантаження...";

  try {
    const entries = await folder.getEntries();
    if (!entries.length) {
      statusBar.textContent = "📂 Порожня тека";
      return;
    }

    for (const entry of entries) {
      const item = document.createElement("div");
      item.className = "tree-item";
      const icon = document.createElement("span");
      icon.textContent = entry.isFile ? "📄" : "📁";
      const name = document.createElement("span");
      name.textContent = entry.name;
      item.append(icon, name);
      container.appendChild(item);

      // ===================================================
      // 🔹 Якщо це тека
      // ===================================================
      if (entry.isFolder) {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "tree-children";
        childrenContainer.style.display = "none";
        container.appendChild(childrenContainer);

        let expanded = false;
        item.addEventListener("click", async (e) => {
          e.stopPropagation();
          expanded = !expanded;
          if (expanded) {
            icon.textContent = "📂";
            if (!childrenContainer.dataset.loaded) {
              await renderTree(entry, childrenContainer);
              childrenContainer.dataset.loaded = true;
            }
            childrenContainer.style.display = "block";
          } else {
            icon.textContent = "📁";
            childrenContainer.style.display = "none";
          }
        });
      }

      // ===================================================
      // 🔹 Якщо це файл
      // ===================================================
      else {
        const ext = entry.name.split(".").pop().toLowerCase();

        // 🔸 Одинарний клік → показати Smart Object-и (PSD/PSB)
        item.addEventListener("click", async (e) => {
          e.stopPropagation();

          if (["psd", "psb"].includes(ext)) {
            const childrenContainer =
              item.nextSibling && item.nextSibling.classList.contains("tree-children")
                ? item.nextSibling
                : document.createElement("div");

            childrenContainer.className = "tree-children";
            container.insertBefore(childrenContainer, item.nextSibling);
            childrenContainer.style.display =
              childrenContainer.style.display === "none" ? "block" : "none";

            // Якщо ще не зчитували
            if (!childrenContainer.dataset.loaded) {
              statusBar.textContent = `🧩 Аналіз ${entry.name}...`;
              const smartTree = await analyzeSmartObjectsFromFile(entry);
              renderSmartTree(smartTree, childrenContainer);
              childrenContainer.dataset.loaded = true;
              statusBar.textContent = `✅ Зчитано смарт-об'єкти (${smartTree.length})`;
            }
          }
        });

        // 🔸 Подвійний клік → відкрити файл
        item.addEventListener("dblclick", async (e) => {
          e.stopPropagation();
          await openFile(entry);
        });
      }
    }

    statusBar.textContent = `✅ Завантажено ${entries.length} елементів`;
  } catch (err) {
    console.error("Помилка при побудові дерева:", err);
    statusBar.textContent = "❌ Не вдалося прочитати теку";
  }
}

// ===================================================
// 🔹 Рекурсивне побудування дерева Smart Object-ів
// ===================================================
function renderSmartTree(nodes, container) {
  if (!nodes || !nodes.length) return;

  for (const node of nodes) {
    const item = document.createElement("div");
    item.className = "tree-item";
    const icon = document.createElement("span");
    icon.textContent = "🧩";
    const name = document.createElement("span");
    name.textContent = node.name;
    item.append(icon, name);
    container.appendChild(item);

    if (node.children && node.children.length) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "tree-children";
      childrenContainer.style.display = "none";
      container.appendChild(childrenContainer);

      let expanded = false;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        expanded = !expanded;
        childrenContainer.style.display = expanded ? "block" : "none";
      });

      renderSmartTree(node.children, childrenContainer);
    }
  }
}

// ===================================================
// 🔹 Аналіз Smart Object-ів з PSD (фонова логіка)
// ===================================================
async function analyzeSmartObjectsFromFile(fileEntry) {
  const { app, core } = require("photoshop");

  return await core.executeAsModal(async () => {
    const previousDoc = app.activeDocument ?? null;
    const openDocsBefore = app.documents.length;

    // 🔹 Відкриваємо документ, якщо він ще не відкритий
    await app.open(fileEntry);
    const targetDoc = app.activeDocument;

    // 🧠 Збираємо Smart Object-и
    const smartData = await collectSmartObjectsRecursive(targetDoc);

    // 🔹 Закриваємо документ, якщо він новий
    if (app.documents.length > openDocsBefore) {
      await targetDoc.closeWithoutSaving();
    }

    // 🔁 Повертаємо користувача назад, якщо треба
    if (previousDoc && previousDoc !== targetDoc) {
      app.activeDocument = previousDoc;
    }

    return smartData;
  }, { commandName: "Analyze Smart Objects" });
}

// ===================================================
// 🔹 Рекурсивний збір Smart Object-ів
// ===================================================
async function collectSmartObjectsRecursive(doc, depth = 0, maxDepth = 4) {
  const { app, core } = require("photoshop");
  const result = [];
  if (depth > maxDepth) return result;

  for (const layer of doc.layers) {
    if (layer.kind === "smartObject") {
      const info = { name: layer.name, type: "smart", children: [] };

      // Якщо linked → просто додаємо шлях
      if (layer.smartObject.link && layer.smartObject.link.path) {
        info.path = layer.smartObject.link.path;
      } else {
        // embedded → відкриваємо, аналізуємо, закриваємо
        await core.executeAsModal(async () => {
          await layer.smartObject.open();
        }, { commandName: "Open Smart Object" });

        const innerDoc = app.activeDocument;
        info.children = await collectSmartObjectsRecursive(innerDoc, depth + 1);

        await core.executeAsModal(async () => {
          await innerDoc.closeWithoutSaving();
        });
      }

      result.push(info);
    }
  }
  return result;
}

// ===================================================
// 🔹 Відкрити файл у Photoshop (через executeAsModal)
// ===================================================
async function openFile(fileEntry) {
  const { app, core } = require("photoshop");
  try {
    const ext = fileEntry.name.split(".").pop().toLowerCase();

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      statusBar.textContent = `⚠️ ${fileEntry.name} — формат не підтримується`;
      return;
    }

    statusBar.textContent = `📂 Відкриття: ${fileEntry.name}`;

    await core.executeAsModal(async () => {
      await app.open(fileEntry);
    }, { commandName: "Відкрити файл через Explorer" });

    statusBar.textContent = `✅ Відкрито ${fileEntry.name}`;
  } catch (err) {
    console.error("Помилка при відкритті файлу:", err);
    statusBar.textContent = "❌ Неможливо відкрити файл";
  }
}

// ===================================================
// 🔹 entrypoints
// ===================================================
entrypoints.setup({
  panels: {
    mainPanel: {
      show(event) {
        const panel = event.node;
        try {
          if (panel && !panel.icon) {
            panel.icon = "icons/icon.png";
          }
        } catch (err) {
          console.error("Не вдалося встановити іконку:", err);
        }
      },
    },
  },
});

console.log("✅ Project Explorer з підтримкою Smart Object-ів завантажено успішно");
