import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface ChatRequest {
  message: string;
  session_id?: string;
  document_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, session_id, document_id } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const sessionId = session_id || randomUUID();

    // In production: store message in chat_messages table and
    // use OpenAI with pgvector similarity search for RAG
    // const context = await vectorSearch(message, document_id);
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4o',
    //   messages: [
    //     { role: 'system', content: SYSTEM_PROMPT + context },
    //     { role: 'user', content: message }
    //   ]
    // });

    // Placeholder response - wire to OpenAI in production
    const placeholderResponse = document_id
      ? `I've analyzed the document. Based on the covenant structure, ${message.toLowerCase().includes('leverage') ? 'the leverage ratio covenant typically requires the issuer to maintain a maximum net leverage ratio, often measured quarterly against trailing twelve-month EBITDA.' : 'I can help you understand specific covenant terms. What would you like to know about this document?'}`
      : 'Please upload and select a bond document to analyze specific covenant terms. I can help extract leverage ratios, interest coverage tests, restricted payment baskets, and more.';

    // Store in DB in production
    // await db.query(`INSERT INTO chat_messages (session_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)`, [sessionId, message, placeholderResponse]);

    return NextResponse.json({
      session_id: sessionId,
      response: placeholderResponse,
      citations: [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }
  // const messages = await db.query('SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at', [sessionId]);
  return NextResponse.json({ session_id: sessionId, messages: [] });
}
