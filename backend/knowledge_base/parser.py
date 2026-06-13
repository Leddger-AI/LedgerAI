import os
from io import BytesIO
from datetime import datetime
from typing import List, Dict

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Extracts raw text from .txt, .pdf, or .docx binary payloads.
    """
    ext = os.path.splitext(filename.lower())[1]
    
    if ext == '.txt':
        return file_bytes.decode('utf-8', errors='ignore')
        
    elif ext == '.pdf':
        if not HAS_PYPDF:
            raise ImportError("pypdf is not installed. Run 'pip install pypdf'")
        
        pdf_file = BytesIO(file_bytes)
        reader = pypdf.PdfReader(pdf_file)
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n\n--- Page Break ---\n\n".join(text_parts)
        
    elif ext in ['.docx', '.doc']:
        if not HAS_DOCX:
            raise ImportError("python-docx is not installed. Run 'pip install python-docx'")
            
        docx_file = BytesIO(file_bytes)
        doc = docx.Document(docx_file)
        text_parts = [para.text for para in doc.paragraphs if para.text]
        return "\n".join(text_parts)
        
    else:
        raise ValueError(f"Unsupported file type: {ext}. Supported types: .txt, .pdf, .docx")

def format_slack_thread(messages: List[Dict]) -> str:
    """
    Chronologically sorts and formats Slack messages from a multi-turn thread
    into a clean conversation log block.
    """
    # Sort messages by timestamp (convert to float for safety)
    sorted_msgs = sorted(
        messages, 
        key=lambda x: float(x.get('timestamp') or 0.0)
    )
    
    thread_lines = []
    thread_lines.append("=== SLACK MULTI-TURN CONVERSATION THREAD ===")
    
    for msg in sorted_msgs:
        user = msg.get('user_id', 'Unknown User')
        text = msg.get('text', '').strip()
        ts = msg.get('timestamp', '')
        
        # Convert timestamp to readable format if valid
        try:
            readable_time = datetime.fromtimestamp(float(ts)).strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            readable_time = str(ts)
            
        thread_lines.append(f"[{readable_time}] User {user}: {text}")
        
    return "\n\n".join(thread_lines)
