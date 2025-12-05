# app.py
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
import requests

app = Flask(__name__ , static_folder="client/build")
CORS(app, origins=[
    "https://assesment-client-ar46yoogw-shreyash-gupta-s-projects.vercel.app",
    "http://localhost:3000"
])
load_dotenv()

DATA_FILE = "submissions.json"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY

@app.before_request
def log_request_info():
    # Print method & path to the server logs so Render shows it
    print(f"[REQUEST] {request.method} {request.path}", file=sys.stdout, flush=True)

@app.route("/", methods=["GET"])
def index():
    # Simple JSON so root never 404
    return jsonify({"status":"running", "message":"Feedback API. Use /submit_review, /submissions, /health"}), 200

@app.route("/favicon.ico")
def favicon():
    return "", 204

@app.route("/health")
def health():
    return jsonify({"status":"ok"}), 200

@app.route("/")
def index():
    return jsonify({"status":"running", "message":"Feedback API. Use /submit"}), 200

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def call_llm_user_response(rating, review):
    prompt = f"""
The following is a customer review for a business. Write a short, polite reply from the business. 

Instructions:
- If the review is positive, thank the customer and highlight something they enjoyed.
- If the review is mixed, thank them, mention the positive, and politely address any concerns.
- If the review is negative, apologize and express willingness to improve.
- Always sign off with: "We hope to serve you better in the future!"

Review: "{review}" (User gave {rating} star(s))

Reply:
"""
    # The LLM is instructed to match sentiment, not just echo!
    try:
        result = call_gemini_text(prompt)
        # Optionally strip whitespace/newlines
        return result.strip()
    except Exception as e:
        print("Error in user response generation:", e)
        return "Thank you for your review! We hope to serve you better in the future."

def call_llm_admin_summary(review):
    # Gemini call for summary + action
    prompt = f"""Given this customer feedback: \"{review}\" 
1. Write a one-sentence summary of the feedback.
2. Suggest a recommended action for the business to improve or follow up.

Format your response in this JSON:
{{
    "summary": "<summary sentence>",
    "recommended_actions": "<single main suggestion>"
}}
"""
    result = call_gemini_single_json(prompt)
    return {
        "summary": result.get("summary", ""),
        "recommended_actions": result.get("recommended_actions", "")
    }

def call_gemini_single_json(prompt):
    try:
        headers = {"Content-Type": "application/json"}
        data = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        resp = requests.post(GEMINI_API_URL, headers=headers, json=data)
        print("Gemini HTTP status:", resp.status_code)
        print("Gemini raw response:", resp.text)
        resp_json = resp.json()
        if "candidates" in resp_json:
            cand = resp_json["candidates"][0]["content"]["parts"][0]["text"]
            print("Gemini content/text:", cand)
            json_start = cand.find("{")
            if json_start >= 0:
                json_obj = json.loads(cand[json_start : cand.rfind("}") + 1])
                print("Gemini parsed JSON:", json_obj)
                return json_obj
    except Exception as e:
        print("Error with Gemini:", e)
    return {}

def call_gemini_text(prompt):
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": prompt}]}]}
    resp = requests.post(GEMINI_API_URL, headers=headers, json=data)
    resp_json = resp.json()
    # Gemini sometimes puts reply in a 'text' field under nested keys:
    text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
    return text

@app.route("/star_summary", methods=["POST"])
def star_summary():
    reviews = request.json.get("reviews", [])
    rating = request.json.get("rating")
    if not reviews:
        return jsonify({"group_action": "(No reviews for this group.)"})
    prompt = (
        f"These are customer reviews with a rating of {rating} star(s):\n" +
        "\n".join([f"- {r}" for r in reviews]) +
        "\nSummarize the most common themes in these reviews, "
        "and suggest the main business action to address this group. "
        "List 2-3 main customer sentiments, and end with one concrete step for the business."
    )
    answer = call_gemini_text(prompt)
    return jsonify({"group_action": answer.strip()})
        
@app.route("/submit_review", methods=["POST"])
def submit_review():
    body = request.json
    rating = int(body.get("rating", 0))
    review = body.get("review", "")
    timestamp = datetime.utcnow().isoformat()

    user_reply = call_llm_user_response(rating, review)
    ai_results = call_llm_admin_summary(review)

    entry = {
        "rating": rating,
        "review": review,
        "timestamp": timestamp,
        "user_reply": user_reply,
        "ai_summary": ai_results["summary"],
        "ai_actions": ai_results["recommended_actions"]
    }
    data = load_data()
    data.append(entry)
    save_data(data)

    return jsonify({"success": True, "user_reply": user_reply})

@app.route("/submissions", methods=["GET"])
def submissions():
    return jsonify(load_data())

if __name__ == "__main__":
    app.run(debug=True)