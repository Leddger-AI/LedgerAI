from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ChunkMetadata(BaseModel):
    document_id: str = Field(..., description="Unique ID of the parent document")
    scope: Literal["personal", "team", "org"] = Field(..., description="Access scope control: personal, team, or org")
    owner_id: str = Field(..., description="Slack User ID of the owner/ingestor")
    team_id: str = Field(..., description="Slack Team ID of the workspace")
    tags: List[str] = Field(default_factory=list, description="Auto-generated semantic tags for indexing")
    source_type: Literal["file", "slack_thread"] = Field(..., description="Source type of ingestion")
    file_name: Optional[str] = Field(None, description="Name of the file if type is file")
    created_at: str = Field(..., description="ISO 8601 timestamp of ingestion")

class DocumentChunk(BaseModel):
    chunk_id: str = Field(..., description="Unique ID of this chunk (e.g. {doc_id}_chunk_{index})")
    document_id: str = Field(..., description="Parent document ID")
    content: str = Field(..., description="Text content of the chunk")
    tokens_count: int = Field(..., description="Approximate token count of this chunk")
    metadata: ChunkMetadata = Field(..., description="Structured metadata payload for Vector DB indexing")

class SlackMessage(BaseModel):
    user_id: str = Field(..., description="Slack User ID of the sender")
    text: str = Field(..., description="Text content of the message")
    timestamp: str = Field(..., description="Unix timestamp of the message")
    thread_ts: Optional[str] = Field(None, description="Parent message ts if in thread")

class SlackThreadIngestionRequest(BaseModel):
    thread_ts: str = Field(..., description="Thread timestamp identifier")
    messages: List[SlackMessage] = Field(..., description="List of messages in the Slack thread")
    scope: Literal["personal", "team", "org"] = "team"
    owner_id: str = Field(..., description="Slack User ID of the request initiator")
    team_id: str = Field(..., description="Slack Workspace Team ID")
