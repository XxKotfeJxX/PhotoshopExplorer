import sys, json, os, re, unicodedata, io
from psd_tools import PSDImage

# 🔹 Шлях до dataFolder твого плагіна
PLUGIN_DATA_DIR = r"C:\Users\andru\AppData\Roaming\Adobe\UXP\PluginsStorage\PHSP\26\Developer\PhotoshopExplorer\PluginData"

# ===================================================
# 🔸 Транслітерація та захист імен
# ===================================================

def translit(text):
    """Найпростіша кирилиця→латиниця"""
    mapping = {
        "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Е": "E", "Ё": "E",
        "Ж": "Zh", "З": "Z", "И": "I", "Й": "Y", "К": "K", "Л": "L", "М": "M",
        "Н": "N", "О": "O", "П": "P", "Р": "R", "С": "S", "Т": "T", "У": "U",
        "Ф": "F", "Х": "Kh", "Ц": "Ts", "Ч": "Ch", "Ш": "Sh", "Щ": "Shch",
        "Ы": "Y", "Э": "E", "Ю": "Yu", "Я": "Ya", "Ь": "", "Ъ": "",
        "Є": "Ye", "І": "I", "Ї": "Yi", "Ґ": "G"
    }
    res = ""
    for ch in text:
        if ch.upper() in mapping:
            tr = mapping[ch.upper()]
            res += tr.lower() if ch.islower() else tr
        else:
            res += ch
    return res

FORBIDDEN = r'[<>:"/\\|?*\x00-\x1F]'
def safe_filename(name: str) -> str:
    """ASCII-безпечне ім'я файлу з транслітерацією"""
    n = translit(name)
    n = unicodedata.normalize("NFKD", n)
    n = re.sub(FORBIDDEN, "_", n)
    n = re.sub(r"[^A-Za-z0-9_.-]", "_", n)
    n = n.strip().rstrip(". ")
    if not n:
        n = "SmartObject"
    return n[:120]

def safe_str(value):
    """Безпечне перетворення в рядок"""
    try:
        return str(value)
    except Exception:
        return ""

def ensure_extract_dir():
    """Гарантує існування папки Extracted у dataFolder"""
    extract_dir = os.path.join(PLUGIN_DATA_DIR, "Extracted")
    os.makedirs(extract_dir, exist_ok=True)
    return extract_dir


# ===================================================
# 🔹 Рекурсивний обхід шарів PSD
# ===================================================

def walk_layers(layers, parent_path, depth=0):
    result = []
    for layer in layers:
        try:
            is_smart = hasattr(layer, "smart_object") and layer.smart_object is not None
            blend_mode = safe_str(getattr(layer, "blend_mode", "normal"))
            bbox = list(getattr(layer, "bbox", (0, 0, 0, 0)))
            kind = getattr(layer, "kind", "unknown")

            info = {
                "name": safe_str(layer.name),
                "visible": bool(getattr(layer, "visible", True)),
                "opacity": int(float(getattr(layer, "opacity", 1)) * 255),
                "blend_mode": blend_mode,
                "is_group": bool(layer.is_group()),
                "is_smart_object": is_smart,
                "bbox": bbox,
                "kind": kind,
                "depth": depth,
            }

            # 🧩 Smart Object — витягуємо деталі
            if is_smart:
                smart_data = layer.smart_object
                linked_path = getattr(smart_data, "linked_filename", None)

                info["is_embedded"] = linked_path is None
                info["linked_path"] = linked_path
                info["temp_extracted_path"] = None

                # ✅ Якщо embedded — зберігаємо у dataFolder/Extracted
                if linked_path is None:
                    try:
                        if hasattr(smart_data, "data") and smart_data.data:
                            extract_dir = ensure_extract_dir()
                            safe_name = safe_filename(safe_str(layer.name))
                            temp_path = os.path.join(extract_dir, f"embedded_{safe_name}.psb")

                            # Якщо файл із такою назвою вже існує — додаємо суфікс
                            base, ext = os.path.splitext(temp_path)
                            counter = 1
                            while os.path.exists(temp_path):
                                temp_path = f"{base}_{counter}{ext}"
                                counter += 1

                            with open(temp_path, "wb") as f:
                                f.write(smart_data.data)

                            info["temp_extracted_path"] = temp_path
                        else:
                            info["temp_extract_error"] = (
                                "⚠️ Немає даних embedded Smart Object-а (smart_object.data порожнє)"
                            )
                    except Exception as e:
                        info["temp_extract_error"] = f"❌ Помилка збереження Smart Object-а: {e}"

            # 🔁 Якщо це група — рекурсія
            if layer.is_group():
                info["children"] = walk_layers(layer, parent_path, depth + 1)

            result.append(info)

        except Exception as e:
            result.append({
                "name": safe_str(getattr(layer, "name", "Unnamed")),
                "error": f"Помилка при читанні шару: {e}",
            })

    return result


# ===================================================
# 🔸 Головна функція
# ===================================================

def main():
    if len(sys.argv) < 2:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        print(json.dumps({"error": "No file path provided"}, ensure_ascii=False))
        sys.exit(1)

    path = sys.argv[1]
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    if not os.path.exists(path):
        print(json.dumps({"error": f"File not found: {path}"}, ensure_ascii=False))
        sys.exit(1)

    try:
        psd = PSDImage.open(path)
        layers = walk_layers(psd, os.path.dirname(path))
        # 👉 JSON гарантовано у UTF-8 без BOM
        print(json.dumps(layers, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)


# ===================================================
# 🔸 Точка входу
# ===================================================
if __name__ == "__main__":
    main()
