import os
import shutil
from PyPDF2 import PdfReader
import fitz  # PyMuPDF

def is_likely_rfp(filename):
    filename = filename.lower()
    include = ["rfp", "solicitation", "statement", "sow", "requirement", "spec"]
    exclude = ["amend", "qa", "sf1449", "mod", "cover", "pricing", "addendum", "attachment"]
    return any(word in filename for word in include) and not any(word in filename for word in exclude)

def check_pdf_for_rfp_keywords(file_path, pages_to_check=3):
    keywords = [
        "request for proposal", "solicitation", "statement of work", "section b", "section m",
        "proposals due", "closing date", "requirement", "specification"
    ]
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc[:pages_to_check]:
            text += page.get_text().lower()
        return any(keyword in text for keyword in keywords)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False

def filter_pdfs_by_content(source_dir, keep_dir, discard_dir, pages_to_check=3):
    os.makedirs(keep_dir, exist_ok=True)
    os.makedirs(discard_dir, exist_ok=True)
    for filename in os.listdir(source_dir):
        if filename.lower().endswith('.pdf'):
            filepath = os.path.join(source_dir, filename)
            try:
                if is_likely_rfp(filename) or check_pdf_for_rfp_keywords(filepath, pages_to_check):
                    shutil.move(filepath, os.path.join(keep_dir, filename))
                    print(f"Kept {filename} (RFP detected by filename or content).")
                else:
                    shutil.move(filepath, os.path.join(discard_dir, filename))
                    print(f"Moved {filename} to discard folder (not an RFP).")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    source = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/sam_api_attachments'))
    keep = os.path.join(source, 'keep')
    discard = os.path.join(source, 'discard')
    filter_pdfs_by_content(source, keep, discard)