// ===================================================
// 🔹 Робота з файлами: відкриття, аналіз Smart Object-ів
// ===================================================

import { setStatus } from "../ui/status.js";
import { collectSmartObjectsRecursive } from "./smartParser.js";

const { app, core } = require("photoshop");

export async function openFile(fileEntry) {
  try {
    setStatus(`Відкриття: ${fileEntry.name}`, "info", { persist: true });

    await core.executeAsModal(async () => {
      await app.open(fileEntry);
    }, { commandName: "Відкрити файл" });

    setStatus(`✅ Відкрито ${fileEntry.name}`, "success", { ttl: 1500 });
  } catch (err) {
    console.error("Помилка при відкритті файлу:", err);
    setStatus("Неможливо відкрити файл", "error", { persist: true });
  }
}

export async function analyzeSmartObjectsFromFile(fileEntry) {
  return await core.executeAsModal(async () => {
    const previousDoc = app.activeDocument ?? null;
    const docsBefore = app.documents.length;

    await app.open(fileEntry);
    const targetDoc = app.activeDocument;

    const smartData = await collectSmartObjectsRecursive(targetDoc);

    if (app.documents.length > docsBefore) {
      await targetDoc.closeWithoutSaving();
    }

    if (previousDoc && previousDoc !== targetDoc) {
      app.activeDocument = previousDoc;
    }

    return smartData;
  }, { commandName: "Analyze Smart Objects" });
}
