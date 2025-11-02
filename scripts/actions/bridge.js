// ===================================================
// 🔹 File-based bridge (через dataFolder, без сокетів)
// ===================================================

const fs = require("uxp").storage.localFileSystem;

async function analyzePSD(filePath) {
  try {
    // 1️⃣ Отримуємо dataFolder — це єдина тека, куди плагін має права на запис
    const bridgeFolder = await fs.getDataFolder();

    // 🔹 Для дебагу — виводимо шлях до теки
    console.log("📁 Data folder path:", bridgeFolder.nativePath);

    // 2️⃣ Створюємо файл запиту
    const reqFile = await bridgeFolder.createFile("request.json", { overwrite: true });
    await reqFile.write(JSON.stringify({ cmd: "analyze", path: filePath }, null, 2));

    // 3️⃣ Чекаємо, поки Python запише result.json
    let resultData = null;
    for (let i = 0; i < 50; i++) {
      try {
        const resFile = await bridgeFolder.getEntry("result.json");
        const content = await resFile.read();
        resultData = JSON.parse(content);
        break;
      } catch {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // 4️⃣ Перевіряємо результат
    if (!resultData) throw new Error("Timeout waiting for delegate response");
    if (!resultData.ok) throw new Error(resultData.error || "Delegate error");

    return resultData.layers || [];
  } catch (err) {
    console.error("❌ analyzePSD() file bridge error:", err);
    throw err;
  }
}

module.exports = { analyzePSD };
