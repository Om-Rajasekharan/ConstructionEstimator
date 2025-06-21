import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from tqdm import tqdm
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://www.rfpdb.com"
SEARCH_URL = "https://www.rfpdb.com/search/search/identifier/8ec982aa56df/page/{}"
OUTPUT_DIR = "rfpdb_pdfs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_rfp_links(page_num):
    url = SEARCH_URL.format(page_num)
    resp = requests.get(url, verify=False)
    soup = BeautifulSoup(resp.text, "html.parser")
    links = []
    for h3 in soup.find_all("h3"):
        a = h3.find("a", href=True)
        if a and "/view/document/name/" in a["href"]:
            links.append(urljoin(BASE_URL, a["href"]))
    return links

def get_pdf_links(rfp_url):
    resp = requests.get(rfp_url, verify=False)
    soup = BeautifulSoup(resp.text, "html.parser")
    pdf_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf"):
            pdf_links.append(urljoin(BASE_URL, href))
    return pdf_links

def download_pdf(pdf_url):
    if not pdf_url.startswith("http://") and not pdf_url.startswith("https://"):
        return
    filename = os.path.join(OUTPUT_DIR, pdf_url.split("/")[-1])
    if os.path.exists(filename):
        return
    resp = requests.get(pdf_url, stream=True, verify=False)
    if resp.status_code == 200:
        with open(filename, "wb") as f:
            for chunk in resp.iter_content(1024):
                f.write(chunk)

if __name__ == "__main__":

    for page_num in tqdm(range(1, 50)):
        rfp_links = get_rfp_links(page_num)
        for rfp_url in rfp_links:
            pdf_links = get_pdf_links(rfp_url)
            for pdf_url in pdf_links:
                download_pdf(pdf_url)