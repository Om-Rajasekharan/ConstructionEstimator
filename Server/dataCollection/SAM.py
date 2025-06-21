import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import PyPDF2
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import shutil

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

SAM_API_KEY = os.getenv('SAM_API_KEY')
QUERY = "construction"
LIMIT = 1000
posted_to = (datetime.now() - timedelta(days=300)).strftime("%m/%d/%Y")
posted_from = (datetime.now() - timedelta(days=600)).strftime("%m/%d/%Y")

def fetch_opportunities(query, limit, posted_from, posted_to):
    url = "https://api.sam.gov/opportunities/v2/search"
    params = {
        "api_key": SAM_API_KEY,
        "q": query,
        "noticeType": "solicitation,combinedsynopsis/solicitation",
        "active": "true",
        "limit": limit,
        "postedFrom": posted_from,
        "postedTo": posted_to
    }
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    return resp.json().get('opportunitiesData', [])

def get_extension_from_content(content):
    if content[:4] == b'%PDF':
        return '.pdf'
    return ''

def download_attachments(opps, download_folder, min_size_bytes=50):
    os.makedirs(download_folder, exist_ok=True)
    for opp in opps:
        notice_id = opp.get('noticeId')
        resource_links = opp.get('resourceLinks')
        if resource_links:
            for idx, link in enumerate(resource_links):
                try:
                    file_name = os.path.basename(link.split('?')[0])
                    if not file_name or file_name.lower() == 'download':
                        file_name = f"{notice_id}_resource_{idx}"
                    else:
                        file_name = f"{notice_id}_resource_{idx}_" + file_name
                    r = requests.get(link)
                    ext = get_extension_from_content(r.content)
                    file_path = os.path.join(download_folder, file_name + ext)
                    if r.status_code == 200:
                        if len(r.content) >= min_size_bytes:
                            with open(file_path, 'wb') as f:
                                f.write(r.content)
                            print(f"Downloaded resource for {notice_id} to {file_path}")
                        else:
                            print(f"Skipped small file for {notice_id}: {file_name} ({len(r.content)} bytes)")
                    else:
                        print(f"Failed to download resource for {notice_id}: {r.status_code}")
                except Exception as e:
                    print(f"Error downloading resource for {notice_id}: {e}")
        addl_link = opp.get('additionalInfoLink')
        if addl_link:
            try:
                file_name = os.path.basename(addl_link.split('?')[0])
                if not file_name or file_name.lower() == 'download':
                    file_name = f"{notice_id}_attachment"
                else:
                    file_name = f"{notice_id}_attachment_" + file_name
                r = requests.get(addl_link)
                ext = get_extension_from_content(r.content)
                file_path = os.path.join(download_folder, file_name + ext)
                if r.status_code == 200:
                    if len(r.content) >= min_size_bytes:
                        with open(file_path, 'wb') as f:
                            f.write(r.content)
                        print(f"Downloaded attachment for {notice_id} to {file_path}")
                    else:
                        print(f"Skipped small attachment for {notice_id}: {file_name} ({len(r.content)} bytes)")
                else:
                    print(f"Failed to download attachment for {notice_id}: {r.status_code}")
            except Exception as e:
                print(f"Error downloading attachment for {notice_id}: {e}")
        if not resource_links and not addl_link:
            print(f"No attachments for {notice_id}")

def extract_text_from_pdfs(pdf_folder, output_folder):
    os.makedirs(output_folder, exist_ok=True)
    for filename in os.listdir(pdf_folder):
        if filename.lower().endswith('.pdf'):
            pdf_path = os.path.join(pdf_folder, filename)
            output_path = os.path.join(output_folder, filename + '.txt')
            try:
                with open(pdf_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    text = ''
                    for page in reader.pages:
                        text += page.extract_text() or ''
                with open(output_path, 'w', encoding='utf-8') as out:
                    out.write(text)
                print(f"Extracted text from {filename} to {output_path}")
            except Exception as e:
                print(f"Failed to extract {filename}: {e}")

def create_opportunity_pdf(opp, output_folder, suffix=None):
    os.makedirs(output_folder, exist_ok=True)
    notice_id = opp.get('noticeId', 'unknown')
    if suffix:
        pdf_path = os.path.join(output_folder, f"{notice_id}_{suffix}.pdf")
    else:
        pdf_path = os.path.join(output_folder, f"{notice_id}.pdf")
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter
    y = height - 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, f"Opportunity: {opp.get('title', '')}")
    y -= 30
    c.setFont("Helvetica", 10)
    fields = [
        ("Notice ID", opp.get('noticeId', '')),
        ("Solicitation Number", opp.get('solicitationNumber', '')),
        ("Department", opp.get('department', '')),
        ("SubTier", opp.get('subTier', '')),
        ("Office", opp.get('office', '')),
        ("Posted Date", opp.get('postedDate', '')),
        ("Type", opp.get('type', '')),
        ("Base Type", opp.get('baseType', '')),
        ("Archive Type", opp.get('archiveType', '')),
        ("Archive Date", opp.get('archiveDate', '')),
        ("Type of Set Aside Description", opp.get('typeOfSetAsideDescription', '')),
        ("Type of Set Aside", opp.get('typeOfSetAside', '')),
        ("Response Deadline", opp.get('responseDeadLine', '')),
        ("NAICS Code", opp.get('naicsCode', '')),
        ("Classification Code", opp.get('classificationCode', '')),
        ("Active", opp.get('active', '')),
    ]
    for label, value in fields:
        c.drawString(40, y, f"{label}: {value}")
        y -= 18
        if y < 60:
            c.showPage()
            y = height - 40
    award = opp.get('award')
    if award:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y, "Award Info:")
        y -= 20
        c.setFont("Helvetica", 10)
        c.drawString(60, y, f"Award Date: {award.get('date', '')}")
        y -= 16
        c.drawString(60, y, f"Award Number: {award.get('number', '')}")
        y -= 16
        c.drawString(60, y, f"Award Amount: {award.get('amount', '')}")
        y -= 16
        awardee = award.get('awardee')
        if awardee:
            c.drawString(60, y, f"Awardee Name: {awardee.get('name', '')}")
            y -= 16
            location = awardee.get('location', {})
            address = location.get('streetAddress', '')
            city = location.get('city', {}).get('name', '')
            state = location.get('state', {}).get('code', '')
            zip_code = location.get('zip', '')
            country = location.get('country', {}).get('code', '')
            c.drawString(60, y, f"Address: {address}, {city}, {state} {zip_code}, {country}")
            y -= 16
    c.save()
    print(f"Created PDF for {notice_id} at {pdf_path}")

if __name__ == "__main__":
    opps = fetch_opportunities(QUERY, LIMIT, posted_from, posted_to)
    print(f"Fetched {len(opps)} opportunities.")
    download_attachments(opps, os.path.join(os.path.dirname(__file__), '../data/sam_api_attachments'))
    pdf_output_folder = os.path.join(os.path.dirname(__file__), '../data/sam_api_opportunity_pdfs')
    for opp in opps:
        create_opportunity_pdf(opp, pdf_output_folder)
