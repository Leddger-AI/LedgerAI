import os
import uuid
import json
from datetime import datetime
from typing import List, Literal, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

# Import components from local package
from knowledge_base.schemas import (
    ChunkMetadata,
    DocumentChunk,
    SlackThreadIngestionRequest
)
from knowledge_base.parser import extract_text_from_bytes, format_slack_thread
from knowledge_base.chunker import RecursiveTextSplitter
from knowledge_base.tagger import generate_semantic_tags


# Create API router
router = APIRouter(prefix="/api/kb", tags=["Knowledge Base"])

# Path to mock file-based database for Phase 1
DOCUMENTS_FILE = os.path.join(
    os.path.dirname(__file__), "data", "documents.json"
)

# Ensure the parent data directory exists
os.makedirs(os.path.dirname(DOCUMENTS_FILE), exist_ok=True)

def load_db() -> dict:
    if os.path.exists(DOCUMENTS_FILE):
        try:
            with open(DOCUMENTS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_db(data: dict):
    with open(DOCUMENTS_FILE, "w") as f:
        json.dump(data, f, indent=2)

@router.post("/ingest/file")
async def ingest_file(
    file: UploadFile = File(...),
    scope: Literal["personal", "team", "org"] = Form("team"),
    owner_id: str = Form(...),
    team_id: str = Form(...),
    chunk_size_tokens: int = Form(3000),
    chunk_overlap_tokens: int = Form(300)
):
    """
    Ingests PDF, TXT, or DOCX documents, chunks the content using the
    RecursiveTextSplitter, tags each chunk via Gemini, and records the metadata.
    """
    # 1. Parse and extract text
    try:
        file_bytes = await file.read()
        text = extract_text_from_bytes(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to extract text from file: {str(e)}"
        )
        
    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Extracted text is empty or blank."
        )
        
    # 2. Chunking
    splitter = RecursiveTextSplitter(
        chunk_size_tokens=chunk_size_tokens,
        chunk_overlap_tokens=chunk_overlap_tokens
    )
    chunks = splitter.split_text(text)
    
    document_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"
    
    # 3. Structuring and Tagging
    processed_chunks = []
    all_tags = set()
    
    for idx, content in enumerate(chunks):
        chunk_id = f"{document_id}_chunk_{idx}"
        
        # Generate tags using Gemini structured outputs (or fallback heuristic)
        tags = generate_semantic_tags(content)
        all_tags.update(tags)
        
        metadata = ChunkMetadata(
            document_id=document_id,
            scope=scope,
            owner_id=owner_id,
            team_id=team_id,
            tags=tags,
            source_type="file",
            file_name=file.filename,
            created_at=created_at
        )
        
        token_count = max(1, int(len(content.split()) * 1.3))
        
        chunk = DocumentChunk(
            chunk_id=chunk_id,
            document_id=document_id,
            content=content,
            tokens_count=token_count,
            metadata=metadata
        )
        processed_chunks.append(chunk.dict())
        
    # 4. Save to Mock Store
    db = load_db()
    db[document_id] = {
        "document_id": document_id,
        "source_type": "file",
        "file_name": file.filename,
        "scope": scope,
        "owner_id": owner_id,
        "team_id": team_id,
        "created_at": created_at,
        "all_tags": list(all_tags),
        "chunks": processed_chunks
    }
    save_db(db)
    
    return {
        "status": "success",
        "document_id": document_id,
        "file_name": file.filename,
        "total_chunks": len(processed_chunks),
        "tags": list(all_tags),
        "chunks": processed_chunks
    }

@router.post("/ingest/slack")
async def ingest_slack_thread(request: SlackThreadIngestionRequest):
    """
    Ingests and structures a multi-turn Slack conversation thread.
    Parses timestamps, sorts messages, chunks conversation log, and indexes metadata.
    """
    if not request.messages:
        raise HTTPException(
            status_code=400,
            detail="Slack thread must contain at least one message."
        )
        
    # 1. Format Slack conversation
    thread_text = format_slack_thread([m.dict() for m in request.messages])
    
    # 2. Chunk (a thread might span multiple chunks if long)
    splitter = RecursiveTextSplitter(
        chunk_size_tokens=3000,
        chunk_overlap_tokens=300
    )
    chunks = splitter.split_text(thread_text)
    
    document_id = f"slack_thread_{request.thread_ts}"
    created_at = datetime.utcnow().isoformat() + "Z"
    
    processed_chunks = []
    all_tags = set()
    
    for idx, content in enumerate(chunks):
        chunk_id = f"{document_id}_chunk_{idx}"
        
        tags = generate_semantic_tags(content)
        all_tags.update(tags)
        
        metadata = ChunkMetadata(
            document_id=document_id,
            scope=request.scope,
            owner_id=request.owner_id,
            team_id=request.team_id,
            tags=tags,
            source_type="slack_thread",
            file_name=None,
            created_at=created_at
        )
        
        token_count = max(1, int(len(content.split()) * 1.3))
        
        chunk = DocumentChunk(
            chunk_id=chunk_id,
            document_id=document_id,
            content=content,
            tokens_count=token_count,
            metadata=metadata
        )
        processed_chunks.append(chunk.dict())
        
    # 3. Save to database
    db = load_db()
    db[document_id] = {
        "document_id": document_id,
        "source_type": "slack_thread",
        "scope": request.scope,
        "owner_id": request.owner_id,
        "team_id": request.team_id,
        "created_at": created_at,
        "all_tags": list(all_tags),
        "chunks": processed_chunks
    }
    save_db(db)
    
    return {
        "status": "success",
        "document_id": document_id,
        "total_chunks": len(processed_chunks),
        "tags": list(all_tags),
        "chunks": processed_chunks
    }

@router.get("/documents")
async def list_documents():
    """
    Returns summaries of all ingested documents in the knowledge base.
    """
    db = load_db()
    results = []
    for doc_id, doc in db.items():
        results.append({
            "document_id": doc_id,
            "source_type": doc.get("source_type"),
            "file_name": doc.get("file_name"),
            "scope": doc.get("scope"),
            "owner_id": doc.get("owner_id"),
            "team_id": doc.get("team_id"),
            "created_at": doc.get("created_at"),
            "tags": doc.get("all_tags", []),
            "total_chunks": len(doc.get("chunks", []))
        })
    return results

@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """
    Retrieves full details and chunks of a specific ingested document.
    """
    db = load_db()
    doc = db.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Document with ID {document_id} not found."
        )
    return doc

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """
    Removes a document and its chunks from the database.
    """
    db = load_db()
    if document_id not in db:
        raise HTTPException(
            status_code=404,
            detail=f"Document with ID {document_id} not found."
        )
    del db[document_id]
    save_db(db)
    return {"status": "success", "message": f"Document {document_id} deleted."}
