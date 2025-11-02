// ===================================================
// 🔹 Рекурсивний збір Smart Object-ів і груп (CommonJS, швидкий fallback)
// ===================================================

const photoshop = require("photoshop");
const app = photoshop.app;

/**
 * Рекурсивно обходить усі шари документа або групи
 * і повертає структуру:
 * [
 *   { id, name, kind, type, visible, opacity, path?, children: [...] }
 * ]
 */
async function collectSmartObjectsRecursive(layerContainer, depth = 0, maxDepth = 3) {
  const result = [];
  if (!layerContainer || depth > maxDepth) return result;

  const layers = Array.from(layerContainer.layers || []);
  for (const layer of layers) {
    try {
      const layerInfo = {
        id: layer.id,
        name: layer.name,
        kind: layer.kind || "unknown",
        visible: layer.visible ?? true,
        opacity: Math.round((layer.opacity ?? 1) * 255),
        type: "layer",
        children: [],
      };

      // ===================================================
      // 🧩 Smart Object
      // ===================================================
      if (layer.kind === "smartObject") {
        layerInfo.type = "smart";

        try {
          const so = layer.smartObject;
          if (so) {
            // linked Smart Object
            if (so.link && so.link.path) {
              layerInfo.linked_path = so.link.path;
              layerInfo.is_embedded = false;
            } else {
              layerInfo.is_embedded = true;
            }
          }
        } catch (soErr) {
          console.warn(`⚠️ Smart Object "${layer.name}" не має дескриптора:`, soErr);
        }
      }

      // ===================================================
      // 🗂️ Група (LayerSet)
      // ===================================================
      if (layer.layers && layer.layers.length > 0) {
        layerInfo.type = "group";
        layerInfo.children = await collectSmartObjectsRecursive(layer, depth + 1, maxDepth);
      }

      result.push(layerInfo);
    } catch (err) {
      console.error(`❌ Помилка при обробці шару "${layer.name}":`, err);
      result.push({
        id: layer.id,
        name: layer.name || "Unnamed",
        type: "error",
        error: String(err),
        children: [],
      });
    }
  }

  return result;
}

module.exports = { collectSmartObjectsRecursive };
