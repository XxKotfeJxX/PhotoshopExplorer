// ===================================================
// 🔹 File-based bridge (через dataFolder, без сокетів)
// ===================================================

const fs = require("uxp").storage.localFileSystem;

async function analyzePSD(filePath) {
  try {
    // 1️⃣ Отримуємо dataFolder — це єдина тека, куди плагін має права на запис
    const bridgeFolder = await fs.getDataFolder();

    console.log("📁 Data folder path:", bridgeFolder.nativePath);

    // 🧹 2️⃣ Видаляємо старий result.json перед новим запитом
    try {
      const oldRes = await bridgeFolder.getEntry("result.json");
      await oldRes.delete();
      console.log("🧹 Стерто старий result.json перед новим аналізом");
    } catch (_) {
      // нічого страшного, якщо немає
    }

    // 3️⃣ Створюємо новий request.json
    const reqFile = await bridgeFolder.createFile("request.json", { overwrite: true });
    await reqFile.write(JSON.stringify({ cmd: "analyze", path: filePath }, null, 2));

    // 4️⃣ Очікуємо появу result.json
    let resultData = null;
    for (let i = 0; i < 50; i++) {
      try {
        const resFile = await bridgeFolder.getEntry("result.json");
        const content = await resFile.read();
        resultData = JSON.parse(content);

        // 💡 Переконуємось, що результат не старий
        if (resultData.source === filePath) break;
      } catch {
        // якщо файл ще не готовий — чекаємо
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // 5️⃣ Перевіряємо результат
    if (!resultData) throw new Error("⏰ Timeout waiting for delegate response");
    if (!resultData.ok) throw new Error(resultData.error || "Delegate error");

    return resultData.layers || [];
  } catch (err) {
    console.error("❌ analyzePSD() bridge error:", err);
    throw err;
  }
}

module.exports = { analyzePSD };
