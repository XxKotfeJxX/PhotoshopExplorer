// ===================================================
// 🔹 Робота з файлами: відкриття, аналіз Smart Object-ів (CommonJS)
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
  const entryPath = fileEntry.nativePath || null; // наприклад: "C:\...\project\art.psd"

  for (const doc of app.documents) {
    const docName = doc.name || doc.title || "";
    const docPath = (() => {
      // У різних версіях UXP може бути doc.path (рядок) або відсутній
      try {
        return doc.path || null;
      } catch (_) {
        return null;
      }
    })();

    // 1) якщо знаємо повний шлях документа — звіряємо з шляхом entry
    if (entryPath && docPath) {
      // нормалізуємо слеші для порівняння
      const fullDocPath = `${docPath}`.replace(/\\/g, "/").replace(/\/+$/, "") + "/" + `${docName}`.replace(/\\/g, "/");
      const normalizedEntryPath = `${entryPath}`.replace(/\\/g, "/");
      if (fullDocPath.toLowerCase() === normalizedEntryPath.toLowerCase()) {
        return doc;
      }
    }

    // 2) fallback: порівняння лише за іменем (можливі колізії, але краще ніж нічого)
    if (docName && entryName && docName.toLowerCase() === entryName.toLowerCase()) {
      return doc;
    }
  }

  return null;
}

// ===================================================
// 🔹 Відкрити файл у Photoshop (корисно для подвійного кліку з дерева)
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

    setStatus(` Відкрито ${fileEntry.name}`, "success", { ttl: 1500 });
  } catch (err) {
    console.error("Помилка при відкритті файлу:", err);
    setStatus("Неможливо відкрити файл", "error", { persist: true });
  }
}

// ===================================================
// 🔹 Аналіз Smart Object-ів з урахуванням 3-х станів
// ===================================================
async function analyzeSmartObjectsFromFile(fileEntry) {
  // запам’ятовуємо активний документ до будь-яких змін
  const previousDoc = app.activeDocument ?? null;

  // намагаємось знайти чи вже відкритий потрібний PSD
  const alreadyOpenDoc = findOpenDocForEntry(fileEntry);

  // прапорці для подальшого відкату стану
  let openedTemporarily = false; // стан 1: відкрили тимчасово і треба закрити
  let switchedTemporarily = false; // стан 2: переключилися тимчасово і треба повернутись
  let targetDoc = null;

  try {
    await core.executeAsModal(
      async () => {
        if (!alreadyOpenDoc) {
          // --- СТАН 1: файл не відкритий ---
          await app.open(fileEntry);
          openedTemporarily = true;
          targetDoc = app.activeDocument; // щойно відкритий стає активним
        } else {
          targetDoc = alreadyOpenDoc;

          if (!previousDoc || previousDoc._id === targetDoc._id) {
            // --- СТАН 3: потрібний документ вже активний ---
            switchedTemporarily = false;
            // нічого не робимо, просто підемо в аналіз
          } else {
            // --- СТАН 2: документ відкритий, але не активний — перемикаємось ---
            app.activeDocument = targetDoc;
            switchedTemporarily = true;
          }
        }
      },
      { commandName: "Підготовка до аналізу" }
    );

    // ⚠️ сам аналіз виконує й модальні операції всередині smartParser (open/close embedded SO),
    // тому тут можемо викликати його напряму
    const smartData = await collectSmartObjectsRecursive(targetDoc);

    return smartData;
  } catch (err) {
    console.error("Помилка аналізу Smart Object-ів:", err);
    throw err;
  } finally {
    // Акуратне прибирання стану (все, що змінює документи — знову в modal)
    await core.executeAsModal(
      async () => {
        // якщо відкривали документ тимчасово — закриваємо його без збереження
        if (openedTemporarily && targetDoc) {
          try {
            await targetDoc.closeWithoutSaving();
          } catch (closeErr) {
            console.warn("Не вдалося закрити тимчасово відкритий документ:", closeErr);
          }
        }

        // якщо тимчасово перемикалися — повертаємо попередній активний документ
        if (switchedTemporarily && previousDoc) {
          try {
            app.activeDocument = previousDoc;
          } catch (switchErr) {
            console.warn("Не вдалося повернути попередній активний документ:", switchErr);
          }
        }
      },
      { commandName: "Відновлення контексту після аналізу" }
    );
  }
}

module.exports = { openFile, analyzeSmartObjectsFromFile };
