from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ClauseType(str, Enum):
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    EVENT_OF_DEFAULT = "event_of_default"
    REPORTING = "reporting"
    NEGATIVE_PLEDGE = "negative_pledge"
    CHANGE_OF_CONTROL = "change_of_control"
    CROSS_DEFAULT = "cross_default"
    OTHER = "other"


class ExtractedClause(BaseModel):
    clause_type: ClauseType = ClauseType.OTHER
    category: str = "other"
    raw_text: str
    normalized_value: Optional[str] = None
    confidence_score: float = Field(default=0.5, ge=0.0, le=1.0)
    page_number: Optional[int] = None
    section_reference: Optional[str] = None


class ExtractionRequest(BaseModel):
    document_id: str
    file_path: str
    file_name: str


class ExtractionResult(BaseModel):
    document_id: str
    clauses: List[ExtractedClause]
    total_pages: int
    extraction_time_seconds: float
    model_used: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExtractionStatus(BaseModel):
    document_id: str
    status: str  # pending, processing, completed, failed
    progress: float = 0.0
    message: Optional[str] = None
    result: Optional[ExtractionResult] = None


class RAGQuery(BaseModel):
    document_ids: List[str]
    question: str
    conversation_history: List[dict] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=20)


class RAGResponse(BaseModel):
    answer: str
    sources: List[dict]
    model_used: str
    tokens_used: int


class DocumentSummary(BaseModel):
    document_id: str
    total_covenants: int
    risk_level: str
    key_financial_covenants: List[dict]
    key_risks: List[str]
    summary: str
