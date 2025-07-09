import sys
import os
import fitz 
import json
from google.cloud import storage

def pdf_to_images(pdf_path, bucket_name, gcs_prefix):
    doc = fitz.open(pdf_path)
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    manifest = []
    for i in range(doc.page_count):
        page = doc.load_page(i)
        pix = page.get_pixmap(dpi=200)
        img_filename = f"{gcs_prefix}_page_{i+1}.png"
        local_dir = os.path.dirname(img_filename)
        if local_dir and not os.path.exists(local_dir):
            os.makedirs(local_dir, exist_ok=True)
        pix.save(img_filename)
        # Upload to GCS
        blob = bucket.blob(f"{gcs_prefix}/page_{i+1}.png")
        blob.upload_from_filename(img_filename)
        manifest.append(f"gs://{bucket_name}/{gcs_prefix}/page_{i+1}.png")
        os.remove(img_filename)
    return manifest

if __name__ == "__main__":
    try:
        pdf_path, bucket_name, gcs_prefix = sys.argv[1:4]
        manifest = pdf_to_images(pdf_path, bucket_name, gcs_prefix)
        print(json.dumps(manifest))
        if not manifest:
            print("Warning: No images generated from PDF.", file=sys.stderr)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        print(json.dumps([])) 
        sys.exit(1)