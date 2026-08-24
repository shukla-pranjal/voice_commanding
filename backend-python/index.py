"""EchoList - HTTP layer (Serverless API).

This API is now completely stateless and designed for Vercel Serverless Functions.
All list and history state is managed by the client and passed in on each request.
"""
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

import i18n
import suggest
from commands import interpret
from intent import IntentClassifier

app = Flask(__name__)
# Enable CORS for Next.js frontend during development
CORS(app)

classifier = IntentClassifier()

CURRENCY = os.environ.get("CURRENCY_SYMBOL", "$")

def _lang(payload):
    return i18n.normalize_lang(payload.get("lang"))

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": "loaded" if classifier.session is not None else "missing"
    })

@app.route("/api/strings", methods=["GET"])
def strings():
    lang = i18n.normalize_lang(request.args.get("lang"))
    return jsonify({"lang": lang, "ui": i18n.ui(lang)})

@app.route("/api/command", methods=["POST"])
def process_command():
    payload = request.get_json(silent=True) or {}
    lang = _lang(payload)
    text = payload.get("text", "")
    items = payload.get("items", [])
    history = payload.get("history", [])

    # The interpret function mutates items and history in place
    outcome = interpret(text, items, history, classifier, lang)

    response = {
        "items": items,
        "history": history,
        "messages": outcome["messages"],
        "trace": outcome["trace"]
    }
    
    if outcome.get("search"):
        results = outcome["search"]["results"]
        meta = outcome["search"]["meta"]
        response["search"] = {
            "results": results,
            "query": meta
        }
        
    return jsonify(response)

@app.route("/api/suggest", methods=["POST"])
def suggestions():
    payload = request.get_json(silent=True) or {}
    lang = _lang(payload)
    items = payload.get("items", [])
    history = payload.get("history", [])
    
    suggested_items = suggest.build(history, items, lang)
    return jsonify({
        "suggestions": suggested_items
    })

# Vercel requires the app to be exposed as 'app'
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=False)
