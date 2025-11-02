// ===================================================
// 🔹 Рекурсивний збір Smart Object-ів і груп (CommonJS, з fallback для відкриття Smart Object)
// ===================================================

const photoshop = require("photoshop");
const app = photoshop.app;
const core = photoshop.core;

/**
 * Рекурсивно проходить усі шари документа та повертає структуру:
 * [
 *   { name, id, type: "smart" | "group", children: [...] }
 * ]
 */
async function collectSmartObjectsRecursive(doc, depth = 0, maxDepth = 4) {
  const result = [];
  if (!doc || doc.closed) return result;
  if (depth > maxDepth) return result;

  const layers = Array.from(doc.layers || []);
  for (const layer of layers) {
    try {
      // ===================================================
      // 🟢 1️⃣ Smart Object
      // ===================================================
      if (layer.kind === "smartObject") {
        const info = {
          id: layer.id,
          name: layer.name,
          type: "smart",
          children: [],
        };

        // спробуємо "пробудити" smartObject-дескриптор
        await core.executeAsModal(async () => {
          app.activeDocument.activeLayers = [layer];
        }).catch(() => {});

        const so = layer.smartObject;

        if (!so) {
          console.warn(`⚠️ Smart "${layer.name}" не має smartObject-дескриптора`);
          result.push(info);
          continue;
        }

        // linked Smart Object
        if (so.link && so.link.path) {
          info.path = so.link.path;
        }

        // embedded Smart Object
        else if (typeof so.open === "function") {
          await core.executeAsModal(
            async () => {
              try {
                await so.open();
              } catch (err) {
                console.warn(`⚠️ Не вдалося відкрити Smart Object "${layer.name}" звичайним способом, пробую batchPlay...`);

                // 🔁 fallback через batchPlay: placedLayerEditContents
                const batchPlay = require("photoshop").action.batchPlay;
                try {
                  await batchPlay(
                    [
                      {
                        _obj: "placedLayerEditContents",
                        _target: [{ _ref: "layer", _id: layer.id }],
                      },
                    ],
                    { synchronousExecution: true, modalBehavior: "execute" }
                  );
                } catch (err2) {
                  console.error(`❌ Навіть fallback не відкрив "${layer.name}"`, err2);
                }
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
                console.warn(
                  `⚠️ Не вдалося закрити вкладений документ "${innerDoc.title || innerDoc.name}"`
                );
              }
            });
          }
        }

        result.push(info);
      }

      // ===================================================
      // 🟣 2️⃣ Група (LayerSet)
      // ===================================================
      else if (layer.layers && layer.layers.length > 0) {
        const info = {
          id: layer.id,
          name: layer.name,
          type: "group",
          children: [],
        };

        info.children = await collectSmartObjectsRecursive(layer, depth + 1, maxDepth);
        result.push(info);
      }

    } catch (err) {
      console.error(`❌ Помилка аналізу шару "${layer.name}":`, err);
      result.push({ name: layer.name, id: layer.id, type: "error", children: [] });
    }
  }

  return result;
}

// ===================================================
// 🔸 Експорт функції
// ===================================================
module.exports = { collectSmartObjectsRecursive };
