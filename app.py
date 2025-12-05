# app.py
import os
import sys
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
import requests

load_dotenv()

# Configure app
# NOTE: static_folder only needed if you will serve the React build from Flask.
app = Flask(__name__, static_folder="client/build")
# Use exact origins (no trailing slash). Add your Vercel URL here.
CORS(app, origins=[
    "https://assesment-client-ar46yoogw-shreyash-gupta-s-projects.vercel.app",
    "http://localhost:3000"
])

DATA_FILE = "submissions.json"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY

# --- diagnostic request logger (helps Render logs) ---
@app.before_request
def log_request_info():
    print(f"[REQUEST] {request.method} {request.path}", file=sys.stdout, flush=True)

# --- safe root and health endpoints ---
@app.route("/", methods=["GET"])
def home():
    # simple root so visiting the base URL does not 404
    return jsonify({"status":"running", "message":"Feedback API. Use /submit_review, /submissions, /health"}), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status":"ok"}), 200

@app.route("/favicon.ico")
def favicon():
    return "", 204

# --- file helpers ---
def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# --- Gemini wrappers (robust) ---
def call_gemini_raw(prompt):
    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY not set", file=sys.stderr)
        return ""
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(GEMINI_API_URL, headers=headers, json=data, timeout=20)
        resp.raise_for_status()
        resp_json = resp.json()
        cand = resp_json.get("candidates", [{}])[0].get("content", {}).get("parts", [])[0].get("text", "")
        return cand
    except Exception as e:
        print("Error calling Gemini:", e, file=sys.stderr)
        return ""

def call_gemini_text(prompt):
    return call_gemini_raw(prompt).strip()

def call_gemini_json(prompt):
    raw = call_gemini_raw(prompt)
    if not raw:
        return {}
    # attempt to extract JSON object
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end >= start:
        try:
            return json.loads(raw[start:end+1])
        except Exception:
            # try crude cleaning
            cleaned = raw[start:end+1].replace("'", '"').replace(",}", "}")
            try:
                return json.loads(cleaned)
            except Exception:
                pass
    return {}

# --- LLM tasks ---
def call_llm_user_response(rating, review):
    prompt = f"""
The following is a customer review. Write a short polite reply (1-2 sentences).
Rules:
- Positive: thank and highlight a positive.
- Mixed: thank, mention positive, address concern.
- Negative: apologize and offer to improve.
Sign off: "We hope to serve you better in the future!"
Review: "{review}" (User gave {rating} star(s))
Reply:
"""
    out = call_gemini_text(prompt)
    return out or "Thank you for your review. We hope to serve you better in the future."

def call_llm_admin_summary(review):
    prompt = f"""Given this customer feedback: \"{review}\"
Return a JSON object with keys:
{{ "summary": "<one-sentence summary>", "recommended_actions": "<single short suggestion>" }}
"""
    return call_gemini_json(prompt)

# --- API endpoints ---
@app.route("/star_summary", methods=["POST"])
def star_summary():
    body = request.get_json(silent=True) or {}
    reviews = body.get("reviews", [])
    rating = body.get("rating")
    if not reviews:
        return jsonify({"group_action": "(No reviews for this group.)"})
    prompt = (
        f"These are customer reviews with a rating of {rating} star(s):\n" +
        "\n".join([f"- {r}" for r in reviews]) +
        "\nSummarize the most common themes and suggest actions (2-3 items)."
    )
    answer = call_gemini_text(prompt)
    return jsonify({"group_action": answer.strip()})

@app.route("/submit_review", methods=["POST"])
def submit_review():
    body = request.get_json(silent=True) or {}
    try:
        rating = int(body.get("rating", 0))
    except Exception:
        rating = 0
    review = (body.get("review") or "").strip()
    if rating < 1 or rating > 5 or not review:
        return jsonify({"error":"invalid input"}), 400

    timestamp = datetime.utcnow().isoformat()
    user_reply = call_llm_user_response(rating, review)
    ai_results = call_llm_admin_summary(review)

    entry = {
        "rating": rating,
        "review": review,
        "timestamp": timestamp,
        "user_reply": user_reply,
        "ai_summary": ai_results.get("summary", ""),
        "ai_actions": ai_results.get("recommended_actions", "")
    }
    data = load_data()
    data.append(entry)
    save_data(data)

    return jsonify({"success": True, "user_reply": user_reply})

@app.route("/submissions", methods=["GET"])
def submissions():
    return jsonify(load_data())

# --- optional: serve React static build if present ---
@app.route("/static/<path:path>")
def static_proxy(path):
    # allow serving static assets if you bundle the React build into the repo
    return send_from_directory(os.path.join(app.static_folder, "static"), path)

@app.route("/<path:path>")
def catch_all(path):
    # if React build exists, serve index.html for SPA routes
    index_path = os.path.join(app.static_folder, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, "index.html")
    return jsonify({"error": "Not Found"}), 404

# --- run ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
