
# mask.py -- Generate room mask overlay from blueprint image
# Usage: python mask.py <input_image_path> [output_dir]

import os
import sys
import requests
from dotenv import load_dotenv
import io
import json
from PIL import Image, ImageOps, ImageDraw

def run_mask(image_path, output_dir=None, threshold=200, verbose=True):
    # Load API key from ../.env
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    API_KEY = os.getenv("ROBOFLOW_API_KEY")
    if not API_KEY:
        raise RuntimeError("ROBOFLOW_API_KEY not found")

    URL = "https://detect.roboflow.com/estima_ai/2"
    PARAMS = {
        "api_key": API_KEY,
        "confidence": 10,
        "overlap": 10,
        "format": "json"
    }

    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)

    # Binarize image
    img_orig = Image.open(image_path).convert("L")
    img_bin = img_orig.point(lambda x: 255 if x > threshold else 0, mode='1')
    bin_image_path = os.path.join(output_dir, "binarized_input.png")
    img_bin.convert("L").save(bin_image_path)
    if verbose:
        print(f"Binarized image saved as {bin_image_path}")

    # POST request to API using binarized image
    img_bytes = io.BytesIO()
    img_bin.convert("RGB").save(img_bytes, format='PNG')
    img_bytes.seek(0)
    response = requests.post(URL, params=PARAMS, files={"file": ("binarized_input.png", img_bytes, "image/png")})

    if response.status_code != 200:
        raise RuntimeError(f"API Error: {response.status_code}\n{response.text}")

    result = response.json()
    if verbose:
        print(f"Detected {len(result.get('predictions', []))} rooms")

    # Save JSON
    json_path = os.path.join(output_dir, "roomplanner_results.json")
    with open(json_path, "w") as jf:
        json.dump(result, jf, indent=2)
    if verbose:
        print(f"Results JSON saved as {json_path}")

    # Draw mask overlay
    try:
        img = Image.open(image_path).convert("RGBA")
        mask = Image.new("RGBA", img.size, (0,0,0,0))
        draw = ImageDraw.Draw(mask)
        for pred in result.get('predictions', []):
            x = pred.get('x')
            y = pred.get('y')
            w = pred.get('width')
            h = pred.get('height')
            if None not in (x, y, w, h):
                left = int(x - w/2)
                top = int(y - h/2)
                right = int(x + w/2)
                bottom = int(y + h/2)
                draw.rectangle([left, top, right, bottom], outline=(255,0,128,180), width=3, fill=(255,0,128,60))
        overlayed = Image.alpha_composite(img, mask)
        overlay_path = os.path.join(output_dir, "room_mask_overlay.png")
        overlayed.save(overlay_path)
        if verbose:
            print(f"Room mask overlay image saved as {overlay_path}")
    except Exception as e:
        print("Could not create mask overlay:", e)

    if verbose:
        print("Results saved in:", output_dir)
    return {
        "binarized_image": bin_image_path,
        "json": json_path,
        "overlay": overlay_path,
        "result": result
    }

if __name__ == "__main__":
    import argparse
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    default_image = os.path.join(SCRIPT_DIR, "data", "ex1.png")
    parser = argparse.ArgumentParser(description="Generate room mask overlay from blueprint image.")
    parser.add_argument("image_path", nargs="?", default=default_image, help=f"Path to input image (default: {default_image})")
    parser.add_argument("--output", "-o", help="Output directory", default=None)
    parser.add_argument("--threshold", type=int, default=200, help="Binarization threshold (default: 200)")
    parser.add_argument("--quiet", action="store_true", help="Suppress verbose output")
    args = parser.parse_args()
    if not os.path.exists(args.image_path):
        print(f"Error: Input image '{args.image_path}' not found.")
        sys.exit(1)
    run_mask(args.image_path, output_dir=args.output, threshold=args.threshold, verbose=not args.quiet)
