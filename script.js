// ===================================================
// 🔹 Головний модуль Photoshop Project Explorer
// ===================================================

// Імпорт UXP API
const uxp = require("uxp");
const entrypoints = uxp.entrypoints;

// Імпорт наших модулів
const { initStatusBar } = require("./scripts/ui/status.js");
const { initTreeUI } = require("./scripts/ui/tree.js");

// ===================================================
// 🔹 Entry point для панелі
// ===================================================
entrypoints.setup({
  panels: {
    mainPanel: {
      show(event) {
        try {
          const panel = event.node || document; // 🧩 fallback на document

          // 🔹 Безпечна іконка
          try {
            if (panel && panel.icon === undefined) {
              panel.icon = "icons/icon.png";
            }
          } catch (_) {}

          // 🔹 Беремо елементи з DOM
          const statusBar = document.getElementById("statusBar");
          const fileTree = document.getElementById("fileTree");
          const openFolderBtn = document.getElementById("openFolderBtn");

          if (!statusBar || !fileTree || !openFolderBtn) {
            console.warn("⚠️ DOM панелі ще не готовий, відкладена ініціалізація...");
            // Пробуємо повторити через невелику затримку
            setTimeout(() => {
              const sb = document.getElementById("statusBar");
              if (sb) {
                initStatusBar(sb);
                initTreeUI(uxp);
                sb.textContent = "✅ Project Explorer готовий до роботи";
                console.log("🧩 Project Explorer ініціалізовано (після затримки)");
              }
            }, 200);
            return;
          }

          // 1️⃣ Ініціалізуємо статус-бар
          initStatusBar(statusBar);

          // 2️⃣ Ініціалізуємо дерево і кнопки
          initTreeUI(uxp);

          // 3️⃣ Початковий статус
          statusBar.textContent = "✅ Project Explorer готовий до роботи";
          console.log("🧩 Project Explorer ініціалізовано успішно");
        } catch (err) {
          console.error("❌ Помилка ініціалізації панелі:", err);
          const statusBar = document.getElementById("statusBar");
          if (statusBar) statusBar.textContent = "❌ Помилка ініціалізації";
        }
      },

      hide() {
        console.log("ℹ️ Панель приховано");
      },
    },
  },
});
