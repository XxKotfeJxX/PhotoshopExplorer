import { localFileSystem } from "uxp";

const openFolderBtn = document.getElementById("openFolderBtn");
const refreshBtn = document.getElementById("refreshBtn");
const fileList = document.getElementById("fileList");
const currentPath = document.getElementById("currentPath");
const statusBar = document.getElementById("statusBar");

let currentFolder = null;

// 🔹 Вибір теки
openFolderBtn.addEventListener("click", async () => {
  try {
    currentFolder = await localFileSystem.getFolder();
    if (!currentFolder) return;
    currentPath.textContent = currentFolder.nativePath;
    await loadFolderContents();
  } catch (err) {
    console.error(err);
    statusBar.textContent = "❌ Помилка при виборі теки";
  }
});

// 🔹 Оновлення
refreshBtn.addEventListener("click", () => {
  if (currentFolder) loadFolderContents();
});

// 🔹 Завантаження вмісту теки
async function loadFolderContents() {
  try {
    statusBar.textContent = "Завантаження...";
    const entries = await currentFolder.getEntries();
    fileList.innerHTML = "";

    for (const entry of entries) {
      const item = document.createElement("div");
      item.className = "file-item";
      item.textContent = entry.name;

      // позначаємо тип
      const label = document.createElement("sp-detail");
      label.size = "xs";
      label.textContent = entry.isFile ? "📄" : "📁";
      item.prepend(label);

      // клік по файлу/теці
      item.addEventListener("click", async () => {
        if (entry.isFolder) {
          currentFolder = entry;
          currentPath.textContent = entry.nativePath;
          await loadFolderContents();
        } else {
          statusBar.textContent = `Файл: ${entry.name}`;
        }
      });

      fileList.appendChild(item);
    }

    statusBar.textContent = `Готово (${entries.length} елементів)`;
  } catch (err) {
    console.error(err);
    statusBar.textContent = "❌ Помилка читання теки";
  }
}
