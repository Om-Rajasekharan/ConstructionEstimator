from transformers import pipeline
import os
import re
import sys
import json
import string
import pdfplumber
import openai
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

'''
IMPORTANT CHECKPOINTS FOR CONSTRUCTION RFPs
1. Materials
2. Labor
3. Equipment
4. Permits and Licenses
5. Insurance and Bonds
6. Safety and Compliance
7. Project Timeline
8. Overhead and Profit
'''

def chunk_text(text, chunk_size=500):
    words = text.split()
    return [' '.join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

def clean_pdf_text(text):
    import string
    text = ''.join(ch for ch in text if ch in string.printable)
    lines = text.splitlines()
    cleaned_lines = []
    for line in lines:
        if len(line) == 0:
            continue
        nonword = sum(1 for c in line if c in '.- \t')
        if nonword / len(line) > 0.6:
            continue
        cleaned_lines.append(line)
    text = ' '.join(cleaned_lines)
    text = re.sub(r'\\s+', ' ', text)
    text = re.sub(r'\\bPage \\d+\\b', '', text)
    text = re.sub(r'\\b\\d+\\b', '', text)
    text = re.sub(r'[^\\x00-\\x7F]+', ' ', text)
    return text.strip()

def extract_text_from_pdfplumber(pdf_path):
    text = ''
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + '\n'
    return text.strip()

def extract_materials_from_pdf(pdf_path):
    import os
    openai.api_key = os.getenv("OPENAI_API_KEY")
    full_text = extract_text_from_pdfplumber(pdf_path)
    chunk_size = 8000
    all_chunks = [c for c in chunk_text(full_text, chunk_size=chunk_size) if c.strip()]
    total_chunks = len(all_chunks)
    for chunk_id, chunk in enumerate(all_chunks):
        prompt = (
            "You are an expert construction estimator. "
            "Read the following RFP excerpt and extract the following sections as a JSON object, with each section clearly labeled. "
            "If a section is not mentioned, use an empty list or null. "
            "Sections:\n"
            "1. metadata: {title, location, owner, contact, issue_date, closing_date, other_dates}\n"
            "2. materials: [list of all major and minor materials/parts, make sure material list is comprehensive. For each, provide: name/description, estimated required amount and units (e.g., pounds, square feet, cubic feet, metric, etc.), estimated cost per unit, reasoning for that material and number, evidence for that material and number, reasoning/evidence for materials that were intentionally left out (materials that were considered but not applicable, if necessary), and total estimated cost for that material.]\n"
            "3. labor: [list of labor types/trades, certifications, etc., and for each, estimate the number of manhours required based on the timeline, project size, and difficulty]\n"
            "4. equipment: [list of equipment, and for each, estimate the quantity or usage required for the project]\n"
            "5. permits_and_licenses: [list]\n"
            "6. insurance_and_bonds: [list]\n"
            "7. subcontractors_and_vendors: [list]\n"
            "8. timeline_and_scheduling: [list or description]\n"
            "9. site_conditions_and_preparation: [list]\n"
            "10. safety_and_compliance: [list]\n"
            "11. overhead_and_profit: [list or description]\n"
            "12. contingencies_and_allowances: [list]\n"
            "13. quality_control_and_testing: [list]\n"
            "14. closeout_and_warranty: [list]\n\n"
            "For each of the 14 sections above, in addition to the main content, include two fields: 'reasoning' (a concise explanation of how you determined the estimate or number for that section) and 'evidence' (direct textual evidence or references from the RFP text that support your estimate). Both fields should be specific and clear.\n"
            "Return your answer as a valid JSON object with these keys. "
            "For each section, provide a concise bullet-point list or a short description. "
            "For 'materials', provide a detailed breakdown as described above. "
            "For 'labor', estimate the number of manhours for each labor type based on the timeline, size, and difficulty. "
            "For 'equipment', estimate the quantity or usage required for each type. "
            "For 'materials' and 'labor', suggest options if possible. "
            "For 'labor', also note if wage selection is required or if average wages can be used.\n\n"
            "At the end of your response, you must: (1) Provide a JSON object called 'section_costs' with estimated costs for each of the 14 sections above (use the same keys). For each section, estimate a reasonable cost based on the RFP text, industry standards, or typical project requirements. Do not leave any section at zero unless there is clear evidence in the RFP that the cost is truly zero. (2) Provide a 'total_bid' field with the sum of all section costs. (3) Provide a JSON object called 'section_costs_explanation' with, for each section, a 'reasoning' and 'evidence' field explaining and supporting the cost estimate. Example: {'section_costs': {'materials': 10000, 'labor': 15000, 'equipment': 5000, ...}, 'total_bid': 40000, 'section_costs_explanation': {'materials': {'reasoning': '...', 'evidence': '...'}, 'labor': {'reasoning': '...', 'evidence': '...'}, ...}}. Return all of these as part of the main JSON object.\n\n"
            + chunk
        )
        response = openai.chat.completions.create(
            model="gpt-4o-mini-2024-07-18",
            messages=[
                {"role": "system", "content": "You are an expert construction estimator."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0.2,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
        try:
            answer_json = json.loads(content)
        except Exception as e:
            answer_json = None
            print(f"[trajectory.py] Failed to parse JSON: {e}", file=sys.stderr, flush=True)
        progress = {
            "chunkIndex": chunk_id,
            "chunkText": chunk,
            "answer": response.choices[0].message.content.strip(),
            "answer_json": answer_json, 
            "page": None,
            "totalChunks": total_chunks
        }
        print(json.dumps(progress), flush=True)
        print(f"[trajectory.py] Processed chunk {chunk_id+1}", file=sys.stderr, flush=True)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        extract_materials_from_pdf(pdf_file)