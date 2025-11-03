import os, json, time, subprocess, sys

# 🔹 Шлях до теки, яку реально використовує Photoshop UXP (dataFolder)
DATA_DIR = r"C:\Users\andru\AppData\Roaming\Adobe\UXP\PluginsStorage\PHSP\26\Developer\PhotoshopExplorer\PluginData"
REQ_PATH = os.path.join(DATA_DIR, "request.json")
RES_PATH = os.path.join(DATA_DIR, "result.json")
DELEGATE_PATH = os.path.join(os.path.dirname(__file__), "delegate.py")

print(f"📡 Bridge file watcher started at {DATA_DIR}")

while True:
    if os.path.exists(REQ_PATH):
        try:
            with open(REQ_PATH, "r", encoding="utf-8") as f:
                msg = json.load(f)

            if msg.get("cmd") == "analyze" and msg.get("path"):
                psd_path = msg["path"]
                print(f"🔍 Running delegate.py for {psd_path}")
                try:
                    out = subprocess.check_output(
                        [sys.executable, DELEGATE_PATH, psd_path],
                        stderr=subprocess.STDOUT,
                        shell=False,
                    )
                    layers = json.loads(out.decode("utf-8", errors="ignore"))
                    result = {
                        "ok": True,
                        "layers": layers,
                        "generated_at": time.time(),
                        "source": psd_path,
                    }
                except subprocess.CalledProcessError as e:
                    result = {
                        "ok": False,
                        "error": f"delegate.py failed: {e.output.decode(errors='ignore')}",
                    }
                except Exception as e:
                    result = {"ok": False, "error": f"delegate.py error: {e}"}
            else:
                result = {"ok": False, "error": "Invalid command or path"}

        except Exception as e:
            result = {"ok": False, "error": str(e)}

        # ✅ Атомарний запис результату
        try:
            tmp_path = RES_PATH + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, RES_PATH)
            os.remove(REQ_PATH)
            print("✅ Processed request.json → result.json")
        except Exception as e:
            print(f"⚠️ Error writing result.json: {e}")

    time.sleep(0.2)
