// ===================================================
// 🔹 Рекурсивний збір Smart Object-ів у документі (CommonJS, стабільна версія)
// ===================================================

const photoshop = require("photoshop");
const app = photoshop.app;
const core = photoshop.core;

async function collectSmartObjectsRecursive(doc, depth = 0, maxDepth = 4) {
  const result = [];
  if (!doc || doc.closed) return result;
  if (depth > maxDepth) return result;

  const layers = Array.from(doc.layers || []);
  for (const layer of layers) {
    if (layer.kind !== "smartObject") continue;

    const info = { name: layer.name, type: "smart", children: [] };

    try {
      const so = layer.smartObject;
      if (!so) {
        console.warn(`⚠️ Layer "${layer.name}" позначено як smartObject, але не має smartObject-дескриптора`);
        result.push(info);
        continue;
      }

      // 🔸 Якщо linked — просто додаємо шлях
      if (so.link && so.link.path) {
        info.path = so.link.path;
      }
      // 🔸 Якщо embedded — намагаємося відкрити рекурсивно
      else if (typeof so.open === "function") {
        await core.executeAsModal(
          async () => {
            try {
              await so.open();
            } catch (err) {
              console.warn(`⚠️ Не вдалося відкрити Smart Object "${layer.name}":`, err);
              throw err;
            }
          },
          { commandName: "Open Smart Object" }
        );

        const innerDoc = app.activeDocument;
        if (innerDoc && !innerDoc.closed) {
          info.children = await collectSmartObjectsRecursive(innerDoc, depth + 1, maxDepth);

          await core.executeAsModal(async () => {
            try {
              await innerDoc.closeWithoutSaving();
            } catch (err) {
              console.warn(`⚠️ Не вдалося закрити вкладений документ "${innerDoc.title || innerDoc.name}"`);
            }
          });
        }
      } else {
        console.warn(`ℹ️ Smart Object "${layer.name}" не має методу open() — пропускаємо`);
      }

      result.push(info);
    } catch (err) {
      console.error(`❌ Помилка аналізу шару "${layer.name}":`, err);
      // додаємо його у список, щоб дерево не рвалось
      result.push({ name: layer.name, type: "smart", error: true });
    }
  }

  return result;
}

module.exports = { collectSmartObjectsRecursive };
