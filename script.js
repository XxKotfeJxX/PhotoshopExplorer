// ===================================================
// 🔹 Головний модуль Photoshop Project Explorer
// ===================================================

// Імпорт UXP API
const uxp = require("uxp");
const entrypoints = uxp.entrypoints;

// Імпорт наших модулів
import { initStatusBar } from "./ui/status.js";
import { initTreeUI } from "./ui/tree.js";

// ===================================================
// 🔹 Entry point для панелі
// ===================================================
entrypoints.setup({
  panels: {
    mainPanel: {
      // Викликається коли панель показується користувачу
      show(event) {
        const panel = event.node;

        try {
          // Встановлюємо іконку панелі (для док-іконки)
          if (panel && !panel.icon) {
            panel.icon = "icons/icon.png";
          }

          // Знаходимо основні DOM-елементи
          const statusBar = document.getElementById("statusBar");

          // 1️⃣ Ініціалізація статус-бара
          initStatusBar(statusBar);

          // 2️⃣ Ініціалізація файлового дерева та кнопок
          initTreeUI(uxp);

          console.log("✅ Project Explorer ініціалізовано успішно");
        } catch (err) {
          console.error("❌ Помилка ініціалізації панелі:", err);
          const statusBar = document.getElementById("statusBar");
          if (statusBar) {
            statusBar.textContent = "❌ Помилка ініціалізації";
          }
        }
      },

      // Опційно: викликається при приховуванні панелі
      hide(event) {
        console.log("ℹ️ Панель приховано");
      },
    },
  },
});
