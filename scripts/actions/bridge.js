// ===================================================
// 🔹 Місток між UXP і Python-делегатом (CommonJS)
// ===================================================

const uxp = require("uxp");
const { shell } = uxp;
const fs = uxp.storage.localFileSystem;

/**
 * Викликає delegate.py і повертає JSON-результат з описом шарів.
 * @param {string} filePath - Повний шлях до PSD-файлу
 * @returns {Promise<object[]>}
 */
async function analyzePSD(filePath) {
  try {
    if (!filePath) throw new Error("File path is required.");

    // 🔹 Формуємо абсолютний шлях до delegate.py
    const pluginFolder = await fs.getPluginFolder();
    const pythonScriptEntry = await pluginFolder.getEntry("psdReader/delegate.py");
    const pythonScript = pythonScriptEntry.nativePath;

    // 🔹 Виклик Python (через shell)
    const result = await shell.execute("python", [pythonScript, filePath], {
      stdoutEncoding: "utf8",
      stderrEncoding: "utf8",
    });

    const output = result.stdout.trim();
    const errorOutput = result.stderr?.trim();

    if (errorOutput && errorOutput.length > 0) {
      console.warn("⚠️ delegate.py stderr:", errorOutput);
    }

    if (!output) {
      throw new Error("Delegate returned empty output.");
    }

    // 🔹 Пробуємо розпарсити JSON
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch (parseErr) {
      console.error("❌ JSON parse error:", parseErr, "\nRaw output:", output);
      throw new Error("Invalid JSON output from delegate.py");
    }

    if (parsed && parsed.error) {
      console.error("❌ Delegate reported error:", parsed.error);
      throw new Error(parsed.error);
    }

    return parsed;
  } catch (err) {
    console.error("❌ analyzePSD() error:", err);
    throw err;
  }
}

// 🔸 Експортуємо як CommonJS
module.exports = { analyzePSD };
