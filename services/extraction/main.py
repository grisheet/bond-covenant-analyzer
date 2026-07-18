"""
Bond Covenant Analyzer - Python Extraction Service
FastAPI service for PDF parsing and AI-powered covenant extraction.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import logging

from .pipeline import ExtractionPipeline
from .tasks import celery_app, process_document_task

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Bond Covenant Extraction Service",
    description="AI-powered extraction of covenants from bond documents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    document_id: str
    file_path: Optional[str] = None
    priority: int = 5


class ProcessResponse(BaseModel):
    document_id: str
    task_id: str
    status: str
    message: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "extraction"}


@app.post("/process/{document_id}", response_model=ProcessResponse)
async def process_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    request: Optional[ProcessRequest] = None,
):
    """Queue a document for covenant extraction."""
    try:
        # Queue as Celery task for async processing
        task = process_document_task.apply_async(
            args=[document_id],
            priority=request.priority if request else 5,
        )
        logger.info(f"Queued extraction task {task.id} for document {document_id}")
        return ProcessResponse(
            document_id=document_id,
            task_id=task.id,
            status="queued",
            message="Document queued for extraction.",
        )
    except Exception as e:
        logger.error(f"Failed to queue document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Check the status of an extraction task."""
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }


@app.get("/metrics")
async def get_metrics():
    """Prometheus-compatible metrics endpoint."""
    return {
        "extraction_tasks_queued": 0,
        "extraction_tasks_completed": 0,
        "extraction_tasks_failed": 0,
        "avg_processing_time_seconds": 0,
    }
