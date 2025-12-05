import os
import json
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

def call_gemini_text(prompt):
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": prompt}]}]}
    resp = requests.post(GEMINI_API_URL, headers=headers, json=data)
    resp_json = resp.json()
    text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
    return text

def handler(request):
    if request.method != "POST":
        return {"statusCode": 405, "body": json.dumps({"error": "Method not allowed"})}
    
    try:
        body = json.loads(request.body)
        reviews = body.get("reviews", [])
        rating = body.get("rating")
        
        if not reviews:
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps({"group_action": "(No reviews for this group.)"})
            }
        
        prompt = (
            f"These are customer reviews with a rating of {rating} star(s):\n" +
            "\n".join([f"- {r}" for r in reviews]) +
            "\nSummarize the most common themes in these reviews, "
            "and suggest the main business action to address this group. "
            "List 2-3 main customer sentiments, and end with one concrete step for the business."
        )
        answer = call_gemini_text(prompt)
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"group_action": answer.strip()})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }

