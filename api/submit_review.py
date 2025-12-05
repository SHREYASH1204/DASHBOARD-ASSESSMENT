import os
import json
from datetime import datetime
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

# Use Vercel's /tmp directory for file storage (read-only filesystem)
DATA_FILE = "/tmp/submissions.json"

def load_data():
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r") as f:
                return json.load(f)
    except:
        pass
    return []

def save_data(data):
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving data: {e}")

def call_gemini_text(prompt):
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": prompt}]}]}
    resp = requests.post(GEMINI_API_URL, headers=headers, json=data)
    resp_json = resp.json()
    text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
    return text

def call_gemini_single_json(prompt):
    try:
        headers = {"Content-Type": "application/json"}
        data = {"contents": [{"parts": [{"text": prompt}]}]}
        resp = requests.post(GEMINI_API_URL, headers=headers, json=data)
        resp_json = resp.json()
        if "candidates" in resp_json:
            cand = resp_json["candidates"][0]["content"]["parts"][0]["text"]
            json_start = cand.find("{")
            if json_start >= 0:
                json_obj = json.loads(cand[json_start : cand.rfind("}") + 1])
                return json_obj
    except Exception as e:
        print("Error with Gemini:", e)
    return {}

def handler(request):
    if request.method != "POST":
        return {"statusCode": 405, "body": json.dumps({"error": "Method not allowed"})}
    
    try:
        body = json.loads(request.body)
        rating = int(body.get("rating", 0))
        review = body.get("review", "")
        timestamp = datetime.utcnow().isoformat()

        # Generate user reply
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
        user_reply = call_gemini_text(prompt).strip()

        # Generate admin summary
        admin_prompt = f"""Given this customer feedback: \"{review}\" 
1. Write a one-sentence summary of the feedback.
2. Suggest a recommended action for the business to improve or follow up.

Format your response in this JSON:
{{
    "summary": "<summary sentence>",
    "recommended_actions": "<single main suggestion>"
}}
"""
        ai_results = call_gemini_single_json(admin_prompt)

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

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"success": True, "user_reply": user_reply})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }

