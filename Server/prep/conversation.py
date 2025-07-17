
import os
import sys
import json
import openai
from dotenv import load_dotenv

# Configure UTF-8 encoding for stdout/stderr
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
openai_api_key = os.getenv("OPENAI_API_KEY")

def summarize_text(text, context_type="page", page_number=None):
    """
    Summarize a single page, file, or workspace worth of text.
    context_type: 'page', 'file', or 'workspace'
    page_number: page number (for page summaries only)
    """
    if context_type == "page" and page_number:
        prompt = f"""Summarize page {page_number} for construction takeoff and estimation purposes. Focus on identifying and including:

1. DIMENSIONS & MEASUREMENTS: All lengths, widths, heights, areas, volumes, linear footage
2. QUANTITIES: Counts of items (doors, windows, fixtures, etc.)
3. MATERIALS: Types, grades, thicknesses, specifications
4. CONSTRUCTION ELEMENTS: Structural components, mechanical systems, architectural features
5. COST FACTORS: Labor requirements, equipment needs, quality standards

Be specific with numbers and units. Include 'Page {page_number}:' at the beginning.

Text to summarize:
{text}"""
    else:
        prompt = f"""Summarize this {context_type} for construction takeoff and estimation purposes. Focus on identifying and including:

1. DIMENSIONS & MEASUREMENTS: All lengths, widths, heights, areas, volumes, linear footage
2. QUANTITIES: Counts of items (doors, windows, fixtures, etc.)
3. MATERIALS: Types, grades, thicknesses, specifications
4. CONSTRUCTION ELEMENTS: Structural components, mechanical systems, architectural features
5. COST FACTORS: Labor requirements, equipment needs, quality standards

Be specific with numbers and units.

Text to summarize:
{text}"""
    client = openai.OpenAI(api_key=openai_api_key)
    response = client.chat.completions.create(
        model="gpt-4o-mini-2024-07-18",
        messages=[
            {"role": "system", "content": f"You are an expert construction estimator AI assistant. Create detailed summaries focused on quantifiable measurements and specifications needed for construction takeoffs and cost estimation."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=512,
        temperature=0.2
    )
    return response.choices[0].message.content

def summarize_file(page_json_paths, output_path):
    """
    Summarize all pages in a file and save the file summary to output_path.
    """
    page_summaries = []
    for i, page_path in enumerate(page_json_paths):
        with open(page_path, 'r', encoding='utf-8') as f:
            page_data = json.load(f)
        page_text = page_data.get('text', '')
  
        page_number = None
        if 'page_' in page_path:
            try:
                page_number = int(page_path.split('page_')[1].split('.')[0])
            except:
                page_number = i + 1
        else:
            page_number = i + 1
        summary = summarize_text(page_text, context_type="page", page_number=page_number)
        page_summaries.append(summary)

    file_summary = summarize_text("\n".join(page_summaries), context_type="file")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({"summary": file_summary, "page_summaries": page_summaries}, f, indent=2)
    return file_summary

def summarize_workspace(file_summary_paths, output_path):
    """
    Summarize all files in a workspace (project) and save the workspace summary to output_path.
    """
    file_summaries = []
    for file_path in file_summary_paths:
        with open(file_path, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        file_summary = file_data.get('summary', '')
        file_summaries.append(file_summary)
    workspace_summary = summarize_text("\n".join(file_summaries), context_type="workspace")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({"summary": workspace_summary, "file_summaries": file_summaries}, f, indent=2)
    return workspace_summary

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: conversation.py <prompt> <context_json_file> [--summarize <type> <output_path> <input_paths...>]"}))
        sys.exit(1)
    if '--summarize' in sys.argv:
        idx = sys.argv.index('--summarize')
        summarize_type = sys.argv[idx+1]  # 'page', 'file', or 'workspace'
        output_path = sys.argv[idx+2]
        input_paths = sys.argv[idx+3:]
        if summarize_type == 'file':
            summarize_file(input_paths, output_path)
        elif summarize_type == 'workspace':
            summarize_workspace(input_paths, output_path)
        elif summarize_type == 'page':
            # Only one input path
            with open(input_paths[0], 'r', encoding='utf-8') as f:
                page_data = json.load(f)
            page_text = page_data.get('text', '')
            summary = summarize_text(page_text, context_type="page")
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({"summary": summary}, f, indent=2)
        else:
            print(json.dumps({"error": "Unknown summarize type"}))
            sys.exit(1)
        print(json.dumps({"status": "summary complete"}))
        sys.exit(0)
    prompt = sys.argv[1]
    context_path = sys.argv[2]
    with open(context_path, 'r', encoding='utf-8') as f:
        context_data = json.load(f)

    # Use summary if available, else fallback to pageText
    summary = context_data.get('summary', None)
    page_text = context_data.get('pageText', '')
    context_for_llm = f"Summary: {summary}" if summary else f"Page text: {page_text}"
    user_prompt = f"{prompt}\n\n{context_for_llm}"

    try:
        client = openai.OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini-2024-07-18",
            messages=[
                {"role": "system", "content": "You are an expert construction estimator AI assistant. Answer based on the provided context."},
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
