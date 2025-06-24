import os
import fitz
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from langchain.text_splitter import RecursiveCharacterTextSplitter
import pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv



load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

PDF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../rfpdb_pdfs'))
CHUNKS_OUTPUT = os.path.abspath(os.path.join(os.path.dirname(__file__), 'rfp_chunks.txt'))

def extract_text_with_ocr(pdf_path):
    doc = fitz.open(pdf_path)
    text = ''
    for page_num, page in enumerate(doc):
        page_text = page.get_text()
        if page_text.strip():
            text += page_text + '\n'
        else:
            images = convert_from_path(pdf_path, first_page=page_num+1, last_page=page_num+1)
            for img in images:
                ocr_text = pytesseract.image_to_string(img)
                text += ocr_text + '\n'
    return text

all_chunks = []
for fname in os.listdir(PDF_DIR):
    if fname.lower().endswith('.pdf'):
        pdf_path = os.path.join(PDF_DIR, fname)
        text = extract_text_with_ocr(pdf_path)
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = splitter.split_text(text)
        for i, chunk in enumerate(chunks):
            all_chunks.append({'filename': fname, 'chunk_id': i, 'text': chunk})

with open(CHUNKS_OUTPUT, 'w', encoding='utf-8') as f:
    for chunk in all_chunks:
        f.write(f"FILENAME: {chunk['filename']} | CHUNK_ID: {chunk['chunk_id']}\n{chunk['text']}\n{'-'*80}\n")

PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_ENV = os.getenv('PINECONE_ENV', 'us-west1-gcp')
INDEX_NAME = os.getenv('PINECONE_INDEX', 'rfp-chunks')

if PINECONE_API_KEY:
    pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
    if INDEX_NAME not in pinecone.list_indexes():
        pinecone.create_index(INDEX_NAME, dimension=384)
    index = pinecone.Index(INDEX_NAME)

    model = SentenceTransformer('all-MiniLM-L6-v2')
    for chunk in all_chunks:
        vector = model.encode(chunk['text']).tolist()
        meta = {'filename': chunk['filename'], 'chunk_id': chunk['chunk_id']}
        index.upsert([(f"{chunk['filename']}_{chunk['chunk_id']}", vector, meta)])
    print(f"Uploaded {len(all_chunks)} chunks to Pinecone index '{INDEX_NAME}'.")
else:
    print("PINECONE_API_KEY not found in environment. Skipping Pinecone upload.")
    
    
    