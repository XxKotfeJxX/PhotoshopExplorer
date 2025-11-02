import os, json, time
from psd_tools import PSDImage

# 🔹 Шлях до тек, які реально використовує Photoshop UXP (dataFolder)
DATA_DIR = r"C:\Users\andru\AppData\Roaming\Adobe\UXP\PluginsStorage\PHSP\26\Developer\PhotoshopExplorer\PluginData"

REQ_PATH = os.path.join(DATA_DIR, "request.json")
RES_PATH = os.path.join(DATA_DIR, "result.json")

print(f"Bridge file watcher started at {DATA_DIR}")

while True:
    if os.path.exists(REQ_PATH):
        try:
            with open(REQ_PATH, "r", encoding="utf-8") as f:
                msg = json.load(f)

            if msg.get("cmd") == "analyze" and msg.get("path"):
                psd = PSDImage.open(msg["path"])
                layers = []
                for l in psd:
                    layers.append({
                        "name": l.name,
                        "is_group": l.is_group(),
                        "visible": bool(l.visible),
                        "is_smart_object": hasattr(l, "smart_object") and l.smart_object is not None
                    })
                result = {"ok": True, "layers": layers}
            else:
                result = {"ok": False, "error": "Invalid command"}
        except Exception as e:
            result = {"ok": False, "error": str(e)}

        try:
            with open(RES_PATH, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            os.remove(REQ_PATH)
            print("✅ Processed request.json -> result.json")
        except Exception as e:
            print(f"⚠️ Error writing result.json: {e}")

    time.sleep(0.2)
