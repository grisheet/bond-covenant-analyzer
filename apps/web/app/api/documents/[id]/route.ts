import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  // In production: query PostgreSQL for document + clauses + metrics
  // const doc = await db.query(
  //   `SELECT d.*, array_agg(ec.*) as clauses, row_to_json(cm.*) as metrics
  //    FROM documents d
  //    LEFT JOIN extracted_clauses ec ON ec.document_id = d.id
  //    LEFT JOIN covenant_metrics cm ON cm.document_id = d.id
  //    WHERE d.id = $1 GROUP BY d.id, cm.id`, [id]
  // );

  return NextResponse.json({
    id,
    title: 'Sample Bond Indenture',
    status: 'pending',
    issuer_name: 'Acme Corp',
    cusip: null,
    isin: null,
    governing_law: 'New York',
    file_size_bytes: 0,
    page_count: 0,
    created_at: new Date().toISOString(),
    clauses: [],
    metrics: {},
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  // await db.query('DELETE FROM documents WHERE id = $1', [id]);
  return NextResponse.json({ success: true, id });
}
