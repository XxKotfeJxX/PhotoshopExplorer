// ===================================================
// 🔹 Рекурсивний збір Smart Object-ів і груп (CommonJS, розширена версія)
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
    try {
      // ===================================================
      // 🟢 1️⃣ Якщо це Smart Object
      // ===================================================
      if (layer.kind === "smartObject") {
        const info = { name: layer.name, type: "smart", children: [] };
        const so = layer.smartObject;

        if (!so) {
          console.warn(`⚠️ Smart "${layer.name}" не має smartObject-дескриптора`);
          result.push(info);
          continue;
        }

        // linked
        if (so.link && so.link.path) {
          info.path = so.link.path;
        }
        // embedded
        else if (typeof so.open === "function") {
          await core.executeAsModal(
            async () => {
              try {
                await so.open();
              } catch (err) {
                console.warn(`⚠️ Не вдалося відкрити Smart Object "${layer.name}":`, err);
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
        }

        result.push(info);
      }

      // ===================================================
      // 🟣 2️⃣ Якщо це Група (LayerSet)
      // ===================================================
      else if (layer.layers && layer.layers.length > 0) {
        const info = { name: layer.name, type: "group", children: [] };
        // рекурсивно обходимо групу
        info.children = await collectSmartObjectsRecursive(layer, depth + 1, maxDepth);
        result.push(info);
      }

    } catch (err) {
      console.error(`❌ Помилка аналізу шару "${layer.name}":`, err);
      result.push({ name: layer.name, type: "error", children: [] });
    }
  }

  return result;
}

module.exports = { collectSmartObjectsRecursive };
