# Photoshop Project Explorer

An Adobe Photoshop UXP panel for browsing PSD projects, inspecting linked
Smart Objects, and opening related files without leaving Photoshop.

## Features

- choose a folder containing PSD projects;
- browse project files in a compact panel;
- inspect Smart Objects referenced by a PSD;
- open PSD files with a double click;
- open linked PSB Smart Objects directly;
- refresh the project tree on demand.

## Requirements

- Adobe Photoshop 22.0 or newer
- UXP Developer Tool, or Photoshop Developer Mode

## Install for development

1. Enable Developer Mode in Photoshop under
   **Edit → Preferences → Plugins**.
2. Open **Plugins → Development → Load Plugin**.
3. Select this repository directory.
4. Open **Plugins → Project Explorer**.

The plugin entry point and permissions are defined in `manifest.json`.

## Project structure

- `index.html`, `styles.css`, `script.js` — UXP panel;
- `manifest.json` — plugin metadata and permissions;
- `psdReader/` — PSD inspection helper;
- `Receiver/` — local receiver utilities.

## License

MIT. See [LICENSE](LICENSE).
