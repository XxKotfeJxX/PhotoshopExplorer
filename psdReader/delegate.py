import sys, json, os, tempfile
from psd_tools import PSDImage


def safe_str(value):
    """Перетворює будь-що в str без крешів"""
    try:
        return str(value)
    except Exception:
        return ""


def walk_layers(layers, parent_path, depth=0):
    """Рекурсивний обхід шарів і груп"""
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

                # Якщо embedded — зберігаємо у тимчасовий .psb
                if linked_path is None and hasattr(smart_data, "data") and smart_data.data:
                    try:
                        safe_name = safe_str(layer.name).replace("/", "_").replace("\\", "_")
                        temp_dir = tempfile.gettempdir()
                        temp_path = os.path.join(temp_dir, f"embedded_{safe_name}.psb")

                        with open(temp_path, "wb") as f:
                            f.write(smart_data.data)

                        info["temp_extracted_path"] = temp_path
                    except Exception as e:
                        info["temp_extract_error"] = f"Не вдалося зберегти Smart Object: {e}"

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


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.exists(path):
        print(json.dumps({"error": f"File not found: {path}"}))
        sys.exit(1)

    try:
        psd = PSDImage.open(path)
        layers = walk_layers(psd, os.path.dirname(path))
        print(json.dumps(layers, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
