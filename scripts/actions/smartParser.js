// ===================================================
// 🔹 Рекурсивний збір Smart Object-ів у документі (CommonJS)
// ===================================================

const photoshop = require("photoshop");
const app = photoshop.app;
const core = photoshop.core;

async function collectSmartObjectsRecursive(doc, depth = 0, maxDepth = 4) {
  const result = [];
  if (depth > maxDepth) return result;

  const layers = Array.from(doc.layers || []);
  for (const layer of layers) {
    if (layer.kind === "smartObject") {
      const info = { name: layer.name, type: "smart", children: [] };

      // 🔸 Якщо linked — просто додаємо шлях
      if (layer.smartObject?.link?.path) {
        info.path = layer.smartObject.link.path;
      } else {
        // 🔸 Якщо embedded — відкриваємо рекурсивно
        await core.executeAsModal(
          async () => {
            await layer.smartObject.open();
          },
          { commandName: "Open Smart Object" }
        );

        const innerDoc = app.activeDocument;
        info.children = await collectSmartObjectsRecursive(innerDoc, depth + 1, maxDepth);

        await core.executeAsModal(async () => {
          await innerDoc.closeWithoutSaving();
        });
      }

      result.push(info);
    }
  }

  return result;
}

// 🔸 Експортуємо функцію
module.exports = { collectSmartObjectsRecursive };
