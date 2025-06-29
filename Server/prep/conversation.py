
import os
import sys
import json
import openai
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
openai.api_key = os.getenv("OPENAI_API_KEY")

def ask_ai_with_context(user_prompt, ai_response_json):
    prompt = (
        "You are an expert construction estimator. "
        "Here is the previous estimate (as JSON):\n"
        f"{json.dumps(ai_response_json, indent=2)}\n\n"
        f"The user asks: {user_prompt}\n"
        "If the user's question requires updating the estimate, return the updated JSON. "
        "Otherwise, answer the question clearly. If you update the JSON, return only the new JSON. "
        "If you only answer, return a plain text answer."
    )
    response = openai.chat.completions.create(
        model="gpt-4o-mini-2024-07-18",
        messages=[
            {"role": "system", "content": "You are an expert construction estimator."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=2048,
        temperature=0.2,
    )
    content = response.choices[0].message.content.strip()
    try:
        answer_json = json.loads(content)
        return {"type": "json", "content": answer_json}
    except Exception:
        return {"type": "text", "content": content}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python conversation.py <user_prompt> <ai_response_json_path>"}))
        sys.exit(1)
    user_prompt = sys.argv[1]
    ai_response_json_path = sys.argv[2]
    try:
        with open(ai_response_json_path, "r", encoding="utf-8") as f:
            ai_response_json = json.load(f)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load AI response JSON: {str(e)}", "path": ai_response_json_path}))
        sys.exit(2)
    try:
        result = ask_ai_with_context(user_prompt, ai_response_json)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": f"AI call or processing failed: {str(e)}"}))
        sys.exit(3)
