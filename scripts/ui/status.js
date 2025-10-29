// ===================================================
// 🔹 Менеджер статус-повідомлень
// ===================================================

let statusTimer = null;
let statusBar = null;

export function initStatusBar(element) {
  statusBar = element;
}

export function setStatus(message, type = "info", options = {}) {
  const { persist = false, ttl = 2000 } = options;
  const prefix = {
    info: "ℹ️",
    success: "✅",
    warn: "⚠️",
    error: "❌",
  }[type] || "ℹ️";

  if (!statusBar) {
    console.warn("⚠️ statusBar не ініціалізовано!");
    return;
  }

  statusBar.textContent = `${prefix} ${message}`;

  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }

  if (!persist) {
    statusTimer = setTimeout(() => {
      statusBar.textContent = "Готово";
      statusTimer = null;
    }, ttl);
  }
}
