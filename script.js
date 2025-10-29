// ===================================================
// 🔹 Головний модуль Photoshop Project Explorer
// ===================================================

// Імпорт UXP API
const uxp = require("uxp");
const entrypoints = uxp.entrypoints;

// Імпорт наших модулів (CommonJS)
const { initStatusBar } = require("./scripts/ui/status.js");
const { initTreeUI } = require("./scripts/ui/tree.js");

// ===================================================
// 🔹 Entry point для панелі
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

          const statusBar = document.getElementById("statusBar");

          // 1️⃣ Ініціалізація статус-бара
          initStatusBar(statusBar);

          // 2️⃣ Ініціалізація файлового дерева та кнопок
          initTreeUI(uxp);

          console.log(" Project Explorer ініціалізовано успішно");
        } catch (err) {
          console.error(" Помилка ініціалізації панелі:", err);
          const statusBar = document.getElementById("statusBar");
          if (statusBar) statusBar.textContent = " Помилка ініціалізації";
        }
      },
      hide() {
        console.log("ℹ️ Панель приховано");
      },
    },
  },
});
