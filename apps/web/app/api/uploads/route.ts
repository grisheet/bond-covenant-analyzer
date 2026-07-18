import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 100MB' }, { status: 400 });
    }

    const documentId = randomUUID();
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadDir, `${documentId}.pdf`);
    await writeFile(filePath, buffer);

    // In production, insert document record into PostgreSQL here
    // const db = await getDb();
    // await db.query(`INSERT INTO documents (id, title, file_path, file_size_bytes, status)
    //   VALUES ($1, $2, $3, $4, 'pending')`, [documentId, file.name, filePath, file.size]);

    // Queue extraction job (Celery/Redis in production)
    // await queueExtractionJob(documentId);

    return NextResponse.json({
      document_id: documentId,
      title: file.name,
      file_size_bytes: file.size,
      status: 'pending',
      message: 'Document uploaded successfully. Extraction will begin shortly.',
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
