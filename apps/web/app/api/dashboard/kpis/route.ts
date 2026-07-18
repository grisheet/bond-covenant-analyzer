import { NextResponse } from 'next/server';

export async function GET() {
  // In production: query aggregate stats from PostgreSQL
  // const stats = await db.query(`
  //   SELECT
  //     COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'completed') as documents_processed,
  //     COUNT(ec.id) as total_clauses_extracted,
  //     COUNT(ec.id) FILTER (WHERE ec.review_status = 'flagged') as flagged_clauses,
  //     AVG(ec.confidence_score) as avg_confidence,
  //     COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'processing') as processing_queue
  //   FROM documents d
  //   LEFT JOIN extracted_clauses ec ON ec.document_id = d.id
  // `);

  return NextResponse.json({
    documents_processed: 0,
    total_clauses_extracted: 0,
    flagged_for_review: 0,
    avg_confidence_score: 0,
    processing_queue: 0,
    recent_documents: [],
    clause_type_breakdown: [
      { category: 'Financial Covenants', count: 0 },
      { category: 'Negative Covenants', count: 0 },
      { category: 'Affirmative Covenants', count: 0 },
      { category: 'Reporting Obligations', count: 0 },
      { category: 'Events of Default', count: 0 },
    ],
  });
}
