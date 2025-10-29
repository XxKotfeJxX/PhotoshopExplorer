// ===================================================
// 🔹 Photoshop Project Explorer — оновлена версія
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

      // 🔸 Якщо це тека — додаємо дочірні елементи
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
      } else {
        // 🔸 Якщо це файл — відкриваємо при кліку
        item.addEventListener("click", async (e) => {
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

console.log("✅ Project Explorer завантажено успішно");
