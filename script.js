import { localFileSystem, entrypoints } from "uxp";
const openFolderBtn = document.getElementById("openFolderBtn");
const refreshBtn = document.getElementById("refreshBtn");
const fileTree = document.getElementById("fileTree");
const currentPath = document.getElementById("currentPath");
const statusBar = document.getElementById("statusBar");

let currentFolder = null;

// 🔹 Вибір теки
openFolderBtn.addEventListener("click", async () => {
  try {
    currentFolder = await localFileSystem.getFolder();
    if (!currentFolder) return;
    currentPath.textContent = currentFolder.nativePath;
    await renderTree(currentFolder, fileTree);
  } catch (err) {
    console.error(err);
    statusBar.textContent = "❌ Помилка при виборі теки";
  }
});

// 🔹 Оновлення
refreshBtn.addEventListener("click", () => {
  if (currentFolder) renderTree(currentFolder, fileTree);
});

// ===================================================
// 🔹 Рекурсивне побудування дерева
// ===================================================
async function renderTree(folder, container) {
  container.innerHTML = "";
  statusBar.textContent = "Завантаження...";

  const entries = await folder.getEntries();
  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = "tree-item";
    const icon = document.createElement("span");
    icon.textContent = entry.isFile ? "📄" : "📁";
    const name = document.createElement("span");
    name.textContent = entry.name;
    item.append(icon, name);
    container.appendChild(item);

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
      item.addEventListener("click", async (e) => {
        e.stopPropagation();
        await openFile(entry);
      });
    }
  }

  statusBar.textContent = `Готово (${entries.length} елементів)`;
}

// ===================================================
// 🔹 Відкрити файл у Photoshop
// ===================================================
async function openFile(fileEntry) {
  try {
    statusBar.textContent = `Відкриття: ${fileEntry.name}`;
    const app = require("photoshop").app;
    await app.open(fileEntry);
    statusBar.textContent = `✅ Відкрито ${fileEntry.name}`;
  } catch (err) {
    console.error(err);
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
          if (panel && panel.icon === undefined) {
            panel.icon = "icons/icon.png";
          }
        } catch (err) {
          console.error("Не вдалося встановити іконку:", err);
        }
      },
    },
  },
});
