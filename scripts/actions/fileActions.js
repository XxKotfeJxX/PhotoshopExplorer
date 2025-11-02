// ===================================================
// 🔹 Робота з файлами: відкриття, аналіз Smart Object-ів і відкриття окремих Smart Object-ів (CommonJS)
// ===================================================

const { setStatus } = require("../ui/status.js");
const { collectSmartObjectsRecursive } = require("./smartParser.js");

const photoshop = require("photoshop");
const app = photoshop.app;
const core = photoshop.core;

/**
 * Спроба знайти відкритий документ, що відповідає fileEntry.
 * Порівняння за повним шляхом (doc.path + doc.name) або, якщо недоступно, за name.
 * ⚠️ Імена можуть збігатися — тому пріоритетно використовуємо шлях (nativePath), якщо у документі він доступний.
 */
function findOpenDocForEntry(fileEntry) {
  const entryName = fileEntry.name;
  const entryPath = fileEntry.nativePath || null; // наприклад: "C:/project/art.psd"

  for (const doc of app.documents) {
    const docName = doc.name || doc.title || "";
    const docPath = (() => {
      try {
        return doc.path || null;
      } catch (_) {
        return null;
      }
    })();

    // 1️⃣ Перевіряємо повний шлях
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

    // 2️⃣ Якщо шлях недоступний — порівнюємо тільки за ім'ям
    if (docName && entryName && docName.toLowerCase() === entryName.toLowerCase()) {
      return doc;
    }
  }

  return null;
}

// ===================================================
// 🔹 Відкрити файл у Photoshop (для подвійного кліку з дерева файлів)
// ===================================================
async function openFile(fileEntry) {
  try {
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
// 🔹 Аналіз Smart Object-ів з урахуванням 3-х станів
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
          // --- СТАН 1: файл не відкритий ---
          await app.open(fileEntry);
          openedTemporarily = true;
          targetDoc = app.activeDocument;
        } else {
          targetDoc = alreadyOpenDoc;

          if (!previousDoc || previousDoc._id === targetDoc._id) {
            // --- СТАН 3: потрібний документ вже активний ---
            switchedTemporarily = false;
          } else {
            // --- СТАН 2: документ відкритий, але не активний ---
            app.activeDocument = targetDoc;
            switchedTemporarily = true;
          }
        }
      },
      { commandName: "Підготовка до аналізу" }
    );

    // 🔸 запускаємо рекурсивний аналіз
    const smartData = await collectSmartObjectsRecursive(targetDoc);
    return smartData;
  } catch (err) {
    console.error("❌ Помилка аналізу Smart Object-ів:", err);
    throw err;
  } finally {
    // 🧹 Прибирання контексту
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
// 🔹 Відкрити Smart Object за його ID у поточному документі
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
  analyzeSmartObjectsFromFile,
  openSmartObjectById,
};
