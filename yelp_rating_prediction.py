import os
import pandas as pd
import json
import random
import requests
from typing import List, Dict
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
assert GEMINI_API_KEY, "GEMINI_API_KEY not set in the environment."
# Use PaLM/Vertex text-bison if gemini-pro not supported
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY


# 1. Load data
DATA_PATH = os.path.join("data", "yelp.csv")
SAMPLE_SIZE = 200
RANDOM_SEED = 42

def load_sample(path: str, n: int, seed: int = 42) -> pd.DataFrame:
    df = pd.read_csv(path)
    # Use only complete rows with 'text' and 'stars'
    df = df.dropna(subset=["text", "stars"])
    df = df[df["stars"].between(1, 5)]
    return df.sample(n=n, random_state=seed)[["text", "stars"]].reset_index(drop=True)

sample_df = load_sample(DATA_PATH, SAMPLE_SIZE, RANDOM_SEED)

# 2. Prompts
def prompt_basic(review: str) -> str:
    return f"""Given the following Yelp review, predict how many stars (1-5) the reviewer gave. Respond only in the following JSON format:\n\n{{\n  \"predicted_stars\": <number>,\n  \"explanation\": \"<reason>\"\n}}\n\nReview:\n{review}"""

def prompt_json_strict(review: str) -> str:
    return f"""You are an expert at classifying Yelp reviews.\nGiven a review, return the most likely rating (1–5 stars) as a JSON object with exactly these two keys:\n- \"predicted_stars\": integer (1–5)\n- \"explanation\": 1-2 sentence reasoning\n\nImportant: Respond with valid JSON and nothing else.\nReview:\n{review}"""

def prompt_cot(review: str) -> str:
    return f"""Read the Yelp review below. First, briefly summarize what the reviewer is saying. Then, reason step by step about their tone, opinions, and details, and finally decide how many stars they most likely gave (1–5). Output only this JSON:\n\n{{\n  \"predicted_stars\": <number>,\n  \"explanation\": \"<reasoning>\"\n}}\n\nReview:\n{review}"""

def prompt_direct_classification(review: str) -> str:
    return f"""Given the Yelp review below, predict how many stars (1-5) the reviewer gave.\nRespond only with JSON as follows:\n{{\n  \"predicted_stars\": <number>,\n  \"explanation\": \"<brief reason>\"\n}}\nReview:\n{review}"""

def prompt_step_by_step_hidden_cot(review: str) -> str:
    return f"""Consider the following Yelp review. Think step by step about the reviewer’s overall tone, the details they mention, their satisfaction, and any positive or negative points. Decide the most likely star rating (1–5).\nThen, respond only with JSON like this (do not show your reasoning):\n{{\n  \"predicted_stars\": <number>,\n  \"explanation\": \"<why you chose this rating>\"\n}}\nReview:\n{review}"""

def prompt_few_shot_calibration(review: str) -> str:
    examples = '''Review: "Terrible experience, food was cold and the service rude."
{
  "predicted_stars": 1,
  "explanation": "The review is very negative about food and service."
}
Review: "Decent lunch, nothing special but quick service."
{
  "predicted_stars": 3,
  "explanation": "The review is mixed with some positive and average comments."
}
Review: "Absolutely loved the desserts and our waiter was wonderful!"
{
  "predicted_stars": 5,
  "explanation": "Very positive review about both food and service."
}
'''
    return f"""Here are examples of Yelp reviews and their ratings:\n{examples}\nNow, given this review, respond with JSON just like the above examples:\nReview: {review}"""

# Replace old PROMPTS with these three:
PROMPTS = [
    ("Direct Classification (Baseline)", prompt_direct_classification),
    ("Step-by-Step Hidden CoT", prompt_step_by_step_hidden_cot),
    ("Few-Shot Calibration", prompt_few_shot_calibration)
]

# Gemini API Call
def gemini_generate(prompt: str) -> str:
    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    response = requests.post(GEMINI_API_URL, headers=headers, json=body)
    try:
        response_json = response.json()
        text = response_json["candidates"][0]["content"]["parts"][0]["text"]
        return text
    except Exception as e:
        print("Error parsing Gemini API response:", e)
        print(response.text)
        return None

# Validate and parse output
def parse_model_output(output: str) -> dict:
    try:
        # Try to extract valid JSON from unstructured output
        start = output.find('{')
        end = output.rfind('}') + 1
        json_str = output[start:end]
        data = json.loads(json_str)
        assert isinstance(data, dict)
        return {
            "predicted_stars": data.get("predicted_stars"),
            "explanation": data.get("explanation")
        }
    except Exception as e:
        print("Invalid JSON response:", output)
        print("Error:", e)
        return {"predicted_stars": None, "explanation": None}

if __name__ == "__main__":
    N = 2  # Test on first 2 reviews only
    for idx in range(N):
        review = sample_df.iloc[idx]["text"]
        true_star = sample_df.iloc[idx]["stars"]
        print(f"\n=== REVIEW #{idx+1} (True stars: {true_star}) ===\n{review}\n")
        for name, func in PROMPTS:
            prompt = func(review)
            print(f"--- {name} Prompt, API Result: ---")
            model_output = gemini_generate(prompt)
            print(model_output)
            result = parse_model_output(model_output if model_output else "")
            print(f"Parsed: Stars: {result['predicted_stars']}, Explanation: {result['explanation']}\n")
            time.sleep(1)  # Be nice to API
