// ===================================================
// 🔹 Робота з файлами, Smart Object-ами та делегатом Python (CommonJS)
// ===================================================

const { setStatus } = require("../ui/status.js");
const { collectSmartObjectsRecursive } = require("./smartParser.js");
const { analyzePSD } = require("./bridge.js");

const photoshop = require("photoshop");
const app = photoshop.app;
const core = photoshop.core;

// ===================================================
// 🔸 Допоміжна функція: знайти відкритий документ для fileEntry
// ===================================================
function findOpenDocForEntry(fileEntry) {
  const entryName = fileEntry.name;
  const entryPath = fileEntry.nativePath || null;

  for (const doc of app.documents) {
    const docName = doc.name || doc.title || "";
    const docPath = (() => {
      try {
        return doc.path || null;
      } catch (_) {
        return null;
      }
    })();

    // 1️⃣ Перевірка повного шляху
    if (entryPath && docPath) {
      const fullDocPath =
        `${docPath}`.replace(/\\/g, "/").replace(/\/+$/, "") +
        "/" +
        `${docName}`.replace(/\\/g, "/");
      const normalizedEntryPath = `${entryPath}`.replace(/\\/g, "/");

      if (fullDocPath.toLowerCase() === normalizedEntryPath.toLowerCase()) {
        return doc;
      }
    }

    // 2️⃣ Якщо шлях недоступний — порівнюємо тільки ім’я
    if (docName && entryName && docName.toLowerCase() === entryName.toLowerCase()) {
      return doc;
    }
  }

  return null;
}

// ===================================================
// 🔹 Відкрити файл у Photoshop (подвійний клік)
// ===================================================
async function openFile(fileEntry) {
  try {
    // Перевіряємо тип файлу
    const lower = fileEntry.name.toLowerCase();
    if (!lower.endsWith(".psd") && !lower.endsWith(".psb")) {
      setStatus("⚠️ Це не PSD/PSB файл", "warning", { ttl: 2000 });
      return;
    }

    setStatus(`Відкриття: ${fileEntry.name}`, "info", { persist: true });

    await core.executeAsModal(
      async () => {
        await app.open(fileEntry);
      },
      { commandName: "Відкрити файл" }
    );

    setStatus(`✅ Відкрито ${fileEntry.name}`, "success", { ttl: 1500 });
  } catch (err) {
    console.error("❌ Помилка при відкритті файлу:", err);
    setStatus("❌ Неможливо відкрити файл", "error", { persist: true });
  }
}

// ===================================================
// 🔹 Аналіз Smart Object-ів через Photoshop API (JS-метод, fallback)
// ===================================================
async function analyzeSmartObjectsFromFile(fileEntry) {
  const previousDoc = app.activeDocument ?? null;
  const alreadyOpenDoc = findOpenDocForEntry(fileEntry);

  let openedTemporarily = false;
  let switchedTemporarily = false;
  let targetDoc = null;

  try {
    await core.executeAsModal(
      async () => {
        if (!alreadyOpenDoc) {
          await app.open(fileEntry);
          openedTemporarily = true;
          targetDoc = app.activeDocument;
        } else {
          targetDoc = alreadyOpenDoc;
          if (!previousDoc || previousDoc._id === targetDoc._id) {
            switchedTemporarily = false;
          } else {
            app.activeDocument = targetDoc;
            switchedTemporarily = true;
          }
        }
      },
      { commandName: "Підготовка до аналізу" }
    );

    const smartData = await collectSmartObjectsRecursive(targetDoc);
    return smartData;
  } catch (err) {
    console.error("❌ Помилка аналізу Smart Object-ів:", err);
    throw err;
  } finally {
    await core.executeAsModal(
      async () => {
        if (openedTemporarily && targetDoc) {
          try {
            await targetDoc.closeWithoutSaving();
          } catch (closeErr) {
            console.warn("⚠️ Не вдалося закрити тимчасово відкритий документ:", closeErr);
          }
        }

        if (switchedTemporarily && previousDoc) {
          try {
            app.activeDocument = previousDoc;
          } catch (switchErr) {
            console.warn("⚠️ Не вдалося повернути попередній активний документ:", switchErr);
          }
        }
      },
      { commandName: "Відновлення контексту після аналізу" }
    );
  }
}

// ===================================================
// 🔹 Аналіз PSD через Python-делегата (delegate.py)
// ===================================================
async function analyzeLayersWithDelegate(fileEntry) {
  try {
    setStatus(`📊 Аналіз PSD через делегата: ${fileEntry.name}`, "info", { persist: true });
    const data = await analyzePSD(fileEntry.nativePath);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error("Delegate returned empty result");
    }

    setStatus(`✅ Аналіз завершено`, "success", { ttl: 1500 });
    return data;
  } catch (err) {
    console.error("❌ delegate.py помилка:", err);
    setStatus("❌ Помилка Python-аналітики", "error", { persist: true });
    return [];
  }
}

// ===================================================
// 🔹 Єдиний універсальний метод аналізу (режим JS або Python з fallback)
// ===================================================
async function analyzeFile(fileEntry, mode = "python") {
  if (mode === "python") {
    try {
      const res = await analyzeLayersWithDelegate(fileEntry);
      if (!res || res.length === 0) throw new Error("Empty delegate output");
      return res;
    } catch (e) {
      console.warn("⚠️ Python-делегат недоступний, fallback на JS-аналіз");
      return await analyzeSmartObjectsFromFile(fileEntry);
    }
  } else {
    return await analyzeSmartObjectsFromFile(fileEntry);
  }
}

// ===================================================
// 🔹 Відкрити Smart Object із даних делегата (linked або temp)
// ===================================================
async function openSmartObjectFromInfo(info) {
  try {
    const path = info.linked_path || info.temp_extracted_path;
    if (!path) {
      console.warn("⚠️ Smart Object не має файлу для відкриття");
      setStatus("⚠️ Немає шляху для Smart Object-а", "warning", { ttl: 2000 });
      return;
    }

    await core.executeAsModal(async () => {
      await app.open(path);
    }, { commandName: "Open Smart Object (Delegate)" });

    setStatus(`🧩 Відкрито Smart Object: ${info.name}`, "success", { ttl: 1500 });
  } catch (err) {
    console.error("❌ Не вдалося відкрити Smart Object:", err);
    setStatus("❌ Помилка відкриття Smart Object-а", "error", { persist: true });
  }
}

// ===================================================
// 🔹 Відкрити Smart Object за ID у поточному документі (через Photoshop API)
// ===================================================
async function openSmartObjectById(layerId) {
  const doc = app.activeDocument;
  if (!doc) {
    console.warn("⚠️ Немає активного документа для відкриття Smart Object-а");
    return;
  }

  const layer = doc.layers.find((l) => l.id === layerId);
  if (!layer) {
    console.warn(`⚠️ Шар із ID ${layerId} не знайдено`);
    return;
  }

  if (layer.kind !== "smartObject" || !layer.smartObject) {
    console.warn(`⚠️ "${layer.name}" не є Smart Object-ом або не має smartObject-дескриптора`);
    return;
  }

  try {
    await core.executeAsModal(
      async () => {
        await layer.smartObject.open();
      },
      { commandName: `Open Smart Object "${layer.name}"` }
    );

    setStatus(`🧩 Відкрито Smart Object: ${layer.name}`, "success", { ttl: 1500 });
  } catch (err) {
    console.error("❌ Не вдалося відкрити Smart Object:", err);
    setStatus("❌ Помилка відкриття Smart Object-а", "error", { persist: true });
  }
}

// ===================================================
// 🔸 Експорт функцій
// ===================================================
module.exports = {
  openFile,
  analyzeFile,
  analyzeSmartObjectsFromFile,
  analyzeLayersWithDelegate,
  openSmartObjectById,
  openSmartObjectFromInfo,
};
