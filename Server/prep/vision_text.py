import os
import sys
import io
from google.cloud import vision
from dotenv import load_dotenv

'''This script extracts text from an image using Google Cloud Vision API.
It reads the image file, sends it to the Vision API, and prints the extracted text.'''

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

key_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../gcs-key.json'))
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = key_path

def extract_text_from_image_vision(image_path):
    client = vision.ImageAnnotatorClient()
    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()
    image = vision.Image(content=content)
    response = client.text_detection(image=image)
    if hasattr(response, 'error') and getattr(response.error, 'message', None):
        print('DEBUG: Vision API error:', response.error.message, file=sys.stderr)
    texts = response.text_annotations
    if texts:
        print('DEBUG: texts[0].description:', repr(texts[0].description), file=sys.stderr)
        return texts[0].description.strip()
    else:
        return ""

def main():
    if len(sys.argv) != 2:
        print(f"Usage: python {os.path.basename(__file__)} <image_path>")
        sys.exit(1)
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        sys.exit(1)
    print("\n--- Extracted Text ---")
    text = extract_text_from_image_vision(image_path)
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('utf-8', errors='replace').decode('utf-8'))

if __name__ == "__main__":
    main() 