import { NextRequest, NextResponse } from 'next/server';

// In production, these would query PostgreSQL via pg or Prisma
// import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  // Mock response - replace with actual DB query in production:
  // const documents = await db.query(
  //   `SELECT d.*, COUNT(ec.id) as covenant_count
  //    FROM documents d
  //    LEFT JOIN extracted_clauses ec ON ec.document_id = d.id
  //    WHERE ($1::text IS NULL OR d.status = $1)
  //    AND ($2::text IS NULL OR d.title ILIKE '%' || $2 || '%')
  //    GROUP BY d.id ORDER BY d.created_at DESC LIMIT $3 OFFSET $4`,
  //   [status, search, limit, (page - 1) * limit]
  // );

  return NextResponse.json({
    documents: [],
    total: 0,
    page,
    limit,
  });
}
