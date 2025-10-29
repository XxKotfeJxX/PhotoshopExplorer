// ===================================================
// 🔹 Іконки для дерева файлів
// ===================================================
import { ICONS } from "../constants.js";

export function createIconImg(src, fallbackEmoji) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.width = 16;
  img.height = 16;
  img.style.display = "inline-block";
  img.style.width = "16px";
  img.style.height = "16px";
  img.style.objectFit = "contain";
  img.onerror = () => img.replaceWith(document.createTextNode(fallbackEmoji));
  return img;
}

export function getFileIconForEntry(entry) {
  if (entry.isFolder) return createIconImg(ICONS.folder, "📁");

  const ext = (entry.name.split(".").pop() || "").toLowerCase();

  if (ext === "psd") return createIconImg(ICONS.psd, "🅿️");
  if (ext === "psb") return createIconImg(ICONS.psb, "🅿️");
  if (["png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff", "tga", "svg", "heic", "webp"].includes(ext))
    return createIconImg(ICONS.image, "🖼️");
  if (ext === "pdf") return createIconImg(ICONS.pdf, "📄");

  return createIconImg(ICONS.generic, "📄");
}
