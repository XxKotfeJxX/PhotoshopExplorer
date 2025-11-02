# ===================================================
# 🔹 delegate_launcher.py — фінальна версія (socket bridge)
# ===================================================

import subprocess, socket, time, os, sys, winreg, pathlib

PORT = 5055
APP_NAME = "PhotoshopDelegateBridge"
RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"

def is_running():
    try:
        s = socket.create_connection(("127.0.0.1", PORT), timeout=1)
        s.close()
        return True
    except Exception:
        return False

def add_to_startup(exe_path):
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, exe_path)
        print(f"✅ Додано в автозапуск: {exe_path}")
    except Exception as e:
        print(f"⚠️ Не вдалося додати в автозапуск: {e}")

def launch_delegate():
    # 🔹 використовуємо sys.executable замість __file__
    script_dir = pathlib.Path(sys.executable).parent
    bridge_path = script_dir / "delegate_bridge.exe"
    print(f"🔍 Пошук delegate_bridge.exe у: {bridge_path}")
    if not bridge_path.exists():
        print("❌ delegate_bridge.exe не знайдено!")
        return
    subprocess.Popen([str(bridge_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)

if __name__ == "__main__":
    exe_path = os.path.abspath(sys.argv[0])
    add_to_startup(exe_path)

    if not is_running():
        print("🟡 Запускаю delegate_bridge...")
        launch_delegate()
        if is_running():
            print("✅ Delegate bridge запущено")
        else:
            print("❌ Не вдалося запустити delegate_bridge")
    else:
        print("✅ Delegate bridge вже працює")
