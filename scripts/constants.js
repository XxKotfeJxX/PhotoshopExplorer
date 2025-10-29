// ===================================================
// 🔹 Константи для Photoshop Explorer (CommonJS)
// ===================================================

const SUPPORTED_EXTENSIONS = [
  "psd", "psb", "png", "jpg", "jpeg", "tif", "tiff",
  "gif", "bmp", "tga", "svg", "pdf", "heic", "webp"
];

// 🔸 Папка /icons має містити ці файли
const ICONS = {
  folder: "icons/folder.png",
  folderOpen: "icons/folder-open.png",
  psd: "icons/file-psd.png",
  psb: "icons/file-psb.png",
  image: "icons/file-image.png",
  pdf: "icons/file-pdf.png",
  generic: "icons/file-generic.png",
  smart: "icons/smart.png",
};

// 🔸 Експортуємо для інших модулів
module.exports = { SUPPORTED_EXTENSIONS, ICONS };
