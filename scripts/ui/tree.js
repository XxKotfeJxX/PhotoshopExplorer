// ===================================================
// 🔹 Побудова дерева файлів і Smart Object-ів + груп (оновлено, підтримка Python-делегата)
// ===================================================

const { SUPPORTED_EXTENSIONS, ICONS } = require("../constants.js");
const { getFileIconForEntry, createIconImg } = require("./icons.js");
const { setStatus } = require("./status.js");
const {
  openFile,
  analyzeFile,
  openSmartObjectById,
  openSmartObjectFromInfo,
} = require("../actions/fileActions.js");

let currentFolder = null;
let localFileSystem = null;

// ===================================================
// 🔹 Ініціалізація UI (кнопки, події)
// ===================================================
function initTreeUI(uxp) {
  localFileSystem = uxp.storage.localFileSystem;

  const openFolderBtn = document.getElementById("openFolderBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const fileTree = document.getElementById("fileTree");
  const currentPath = document.getElementById("currentPath");

  openFolderBtn.addEventListener("click", async () => {
    try {
      currentFolder = await localFileSystem.getFolder({ allowSystem: true });
      if (!currentFolder) {
        setStatus("🚫 Теку не вибрано", "warn");
        return;
      }

      currentPath.textContent = currentFolder.nativePath || "(невідомо)";
      await renderTree(currentFolder, fileTree);
      setStatus("✅ Список оновлено", "success");
    } catch (err) {
      console.error("Помилка при виборі теки:", err);
      setStatus("❌ Помилка при виборі теки", "error", { persist: true });
    }
  });

  refreshBtn.addEventListener("click", async () => {
  try {
    if (!currentFolder) {
      setStatus("🚫 Теку не вибрано", "warn");
      return;
    }

    if (!currentFolder.isFolder) {
      setStatus("⚠️ Поточний елемент не є текою", "warn");
      return;
    }

    setStatus("🔄 Оновлення...", "info");
    const fileTree = document.getElementById("fileTree");
    await renderTree(currentFolder, fileTree);
    setStatus("✅ Оновлено", "success", { ttl: 1500 });
  } catch (err) {
    console.error("Помилка оновлення:", err);
    setStatus("❌ Не вдалося оновити", "error", { persist: true });
  }
});

}

// ===================================================
// 🔹 Основна функція побудови дерева теки
// ===================================================
async function renderTree(folder, container) {
  container.innerHTML = "";
  setStatus("Завантаження...");

  try {
    const entries = await folder.getEntries();

    if (!entries.length) {
      setStatus("📂 Порожня тека", "info", { ttl: 1500 });
      return;
    }

    for (const entry of entries) {
      const item = document.createElement("div");
      item.className = "tree-item";

      const iconNode = getFileIconForEntry(entry);
      const name = document.createElement("span");
      name.textContent = entry.name;

      item.append(iconNode, name);
      container.appendChild(item);

      if (entry.isFolder) {
        setupFolderItem(entry, item, container, iconNode);
      } else {
        setupFileItem(entry, item, container);
      }
    }

    setStatus(`✅ Завантажено ${entries.length} елементів`, "success", { ttl: 1500 });
  } catch (err) {
    console.error("Помилка при побудові дерева:", err);
    setStatus("❌ Не вдалося прочитати теку", "error", { persist: true });
  }
}

// ===================================================
// 🔹 Обробник для папок
// ===================================================
function setupFolderItem(entry, item, container, iconNode) {
  const childrenContainer = document.createElement("div");
  childrenContainer.className = "tree-children";
  childrenContainer.style.display = "none";
  container.appendChild(childrenContainer);

  let expanded = false;

  item.addEventListener("click", async (e) => {
    e.stopPropagation();
    expanded = !expanded;

    if (expanded) {
      if (iconNode.tagName === "IMG") iconNode.src = ICONS.folderOpen;
      else iconNode.textContent = "📂";

      if (!childrenContainer.dataset.loaded) {
        await renderTree(entry, childrenContainer);
        childrenContainer.dataset.loaded = "1";
      }
      childrenContainer.style.display = "block";
    } else {
      if (iconNode.tagName === "IMG") iconNode.src = ICONS.folder;
      else iconNode.textContent = "📁";
      childrenContainer.style.display = "none";
    }
  });
}

// ===================================================
// 🔹 Обробник для файлів (PSD/PSB)
// ===================================================
function setupFileItem(entry, item, container) {
  const ext = (entry.name.split(".").pop() || "").toLowerCase();

  // 🔸 Одинарний клік → аналіз через Python (або JS fallback)
  item.addEventListener("click", async (e) => {
    e.stopPropagation();

    if (!["psd", "psb"].includes(ext)) return;
    if (item.dataset.loading === "1") return;

    let childrenContainer =
      item.nextSibling && item.nextSibling.classList.contains("tree-children")
        ? item.nextSibling
        : null;

    if (!childrenContainer) {
      childrenContainer = document.createElement("div");
      childrenContainer.className = "tree-children";
      container.insertBefore(childrenContainer, item.nextSibling);
    }

    const isHidden =
      childrenContainer.style.display === "none" || !childrenContainer.style.display;
    childrenContainer.style.display = isHidden ? "block" : "none";
    if (!isHidden) return;

    if (!childrenContainer.dataset.loaded) {
      item.dataset.loading = "1";
      setStatus(`🧩 Аналіз ${entry.name}...`, "info", { persist: true });

      try {
        const smartTree = await analyzeFile(entry, "python");
        childrenContainer.innerHTML = "";
        renderSmartTree(smartTree, childrenContainer);
        childrenContainer.dataset.loaded = "1";
        setStatus(`✅ Зчитано об'єкти (${smartTree.length})`, "success", { ttl: 1800 });
      } catch (err) {
        console.error("Помилка аналізу:", err);
        setStatus("❌ Помилка аналізу файлу", "error", { persist: true });
      } finally {
        item.dataset.loading = "";
      }
    }
  });

  // 🔸 Подвійний клік → відкрити файл у Photoshop
  item.addEventListener("dblclick", async (e) => {
    e.stopPropagation();
    await openFile(entry);
  });
}

// ===================================================
// 🔹 Побудова дерева Smart Object-ів і груп
// ===================================================
function renderSmartTree(nodes, container) {
  if (!nodes || !nodes.length) {
    const empty = document.createElement("div");
    empty.className = "tree-item";
    empty.style.opacity = "0.7";
    empty.append(document.createTextNode("— Об’єкти не знайдено —"));
    container.appendChild(empty);
    return;
  }

  for (const node of nodes) {
    const item = document.createElement("div");
    item.className = "tree-item";

    let icon;
    if (node.is_group || node.type === "group") {
      icon = createIconImg(ICONS.folder, "📁");
    } else if (node.is_smart_object || node.type === "smart") {
      icon = createIconImg(ICONS.smart, "🧩");
    } else {
      icon = document.createTextNode("📄");
    }

    const name = document.createElement("span");
    name.textContent = node.name || "(Без назви)";
    item.append(icon, name);
    container.appendChild(item);

    // 🧩 Подвійний клік — відкриття Smart Object
    if (node.is_smart_object || node.type === "smart") {
      item.addEventListener("dblclick", async (e) => {
        e.stopPropagation();

        // Якщо є шлях (linked/temp) — відкриваємо з делегата
        if (node.linked_path || node.temp_extracted_path) {
          await openSmartObjectFromInfo(node);
        }
        // Якщо є ID — відкриваємо через Photoshop API
        else if (node.id) {
          await openSmartObjectById(node.id);
        } else {
          setStatus("⚠️ Немає даних для відкриття Smart Object-а", "warn", { ttl: 1500 });
        }
      });
    }

    // 🔁 Якщо є вкладені елементи
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

        if ((node.is_group || node.type === "group") && icon.tagName === "IMG") {
          icon.src = expanded ? ICONS.folderOpen : ICONS.folder;
        }
      });

      renderSmartTree(node.children, childrenContainer);
    }
  }
}

// ===================================================
// 🔸 Експорт функцій
// ===================================================
module.exports = { initTreeUI, renderTree };
