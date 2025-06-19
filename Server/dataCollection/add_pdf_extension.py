import os

def add_pdf_extension_if_needed(folder):
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        if os.path.isfile(file_path):
            # Check if file already ends with .pdf
            if not filename.lower().endswith('.pdf'):
                # Check if file is a PDF by reading the first few bytes
                with open(file_path, 'rb') as f:
                    header = f.read(4)
                if header == b'%PDF':
                    new_path = file_path + '.pdf'
                    os.rename(file_path, new_path)
                    print(f"Renamed {filename} to {os.path.basename(new_path)}")

# Example usage:
add_pdf_extension_if_needed(r'C:\Users\gpayn\OneDrive\Desktop\vulcan\construction_estimator\Server\data\sam_api_attachments')
