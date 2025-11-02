# delegate_runner.py
from flask import Flask, request, jsonify
from psd_tools import PSDImage
import os, json, tempfile

app = Flask(__name__)

@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"ok": True, "message": "Delegate alive"})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    path = data.get("path")
    try:
        psd = PSDImage.open(path)
        layers = []
        for layer in psd:
            layers.append({
                "name": layer.name,
                "is_group": layer.is_group(),
                "visible": bool(layer.visible),
                "is_smart_object": hasattr(layer, "smart_object") and layer.smart_object is not None
            })
        return jsonify({"ok": True, "layers": layers})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, ssl_context='adhoc')

