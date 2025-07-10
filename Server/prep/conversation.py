
import os
import sys
import json
import openai
from dotenv import load_dotenv

import easyocr
from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
openai_api_key = os.getenv("OPENAI_API_KEY")

_easyocr_reader = None

def extract_text_from_image(image_path):
    global _easyocr_reader
    print(f"[DEBUG] Attempting OCR on: {image_path}", file=sys.stderr)
    try:
        with Image.open(image_path) as img:
            max_dim = 1000
            if img.width > max_dim or img.height > max_dim:
                scale = min(max_dim / img.width, max_dim / img.height)
                new_size = (int(img.width * scale), int(img.height * scale))
                img = img.resize(new_size, Image.LANCZOS)
                temp_resized = image_path + "_resized.png"
                img.save(temp_resized)
                image_path_to_ocr = temp_resized
            else:
                image_path_to_ocr = image_path

        if _easyocr_reader is None:
            _easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        result = _easyocr_reader.readtext(image_path_to_ocr, detail=0, paragraph=False)
        text = '\n'.join(result)
        if image_path_to_ocr != image_path:
            try:
                os.remove(image_path_to_ocr)
            except Exception:
                pass
        return text.strip()
    except Exception as e:
        print(f"[DEBUG] OCR failed: {e}", file=sys.stderr)
        return f"[Image OCR failed: {e}]"

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: conversation.py <prompt> <context_json_file>"}))
        sys.exit(1)
    prompt = sys.argv[1]
    context_path = sys.argv[2]
    with open(context_path, 'r', encoding='utf-8') as f:
        context_data = json.load(f)

    page_text = ""
    image_ocr_text = ""
    if context_data and isinstance(context_data, dict):
        if 'pageImagePath' in context_data and context_data['pageImagePath']:
            image_path = context_data['pageImagePath']
            print(f"[DEBUG] Found pageImagePath in context: {image_path}", file=sys.stderr)
            if os.path.exists(image_path):
                image_ocr_text = extract_text_from_image(image_path)
            else:
                print(f"[DEBUG] Image path does not exist: {image_path}", file=sys.stderr)
        elif 'pageData' in context_data:
            page_data = context_data['pageData']
            if isinstance(page_data, dict):
                if 'text' in page_data:
                    page_text = page_data['text']
                if 'imagePath' in page_data:
                    image_ocr_text = extract_text_from_image(page_data['imagePath'])
            elif isinstance(page_data, str):
                if os.path.exists(page_data):
                    image_ocr_text = extract_text_from_image(page_data)

    context_for_llm = f"Page text: {page_text}\nImage OCR: {image_ocr_text}"
    user_prompt = f"{prompt}\n\n{context_for_llm}"

    try:
        client = openai.OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini-2024-07-18",
            messages=[
                {"role": "system", "content": "You are an expert construction estimator AI assistant. Answer based on the provided page content and image."},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=512,
            temperature=0.2
        )
        answer = response.choices[0].message.content
        print(json.dumps({"content": answer}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
