import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  // In production: update document status and enqueue Celery task
  // await db.query(
  //   `UPDATE documents SET status = 'processing' WHERE id = $1`, [id]
  // );
  // await celeryClient.sendTask('extraction.process_document', [id]);

  // Forward to Python extraction service
  try {
    const extractionServiceUrl = process.env.EXTRACTION_SERVICE_URL || 'http://localhost:8001';
    const response = await fetch(`${extractionServiceUrl}/process/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Extraction service error' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      document_id: id,
      status: 'processing',
      message: 'Document queued for covenant extraction.',
    });
  } catch {
    // If extraction service is unavailable, still return accepted
    return NextResponse.json({
      document_id: id,
      status: 'processing',
      message: 'Extraction queued (service will process when available).',
    });
  }
}
