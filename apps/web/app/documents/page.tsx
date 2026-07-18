'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  status: string;
  issuer_name: string;
  file_size_bytes: number;
  created_at: string;
  page_count: number;
  covenant_count?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  processing: 'bg-blue-900 text-blue-300',
  completed: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => { setDocuments(data.documents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = documents.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.issuer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-gray-400 mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''} in library</p>
          </div>
          <Link
            href="/upload"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg font-semibold transition-colors"
          >
            + Upload
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search by title or issuer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 mb-6 focus:outline-none focus:border-blue-500"
        />

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">No documents found</p>
            <Link href="/upload" className="text-blue-400 hover:text-blue-300">
              Upload your first document
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <div className="bg-gray-900 rounded-xl p-5 hover:bg-gray-800 transition-colors border border-gray-800 hover:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <h2 className="font-semibold text-lg truncate">{doc.title || 'Untitled'}</h2>
                      <p className="text-gray-400 text-sm mt-1">{doc.issuer_name || 'Unknown Issuer'}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[doc.status] || 'bg-gray-800 text-gray-300'}`}>
                      {doc.status}
                    </span>
                  </div>
                  <div className="flex gap-6 mt-4 text-sm text-gray-500">
                    <span>{doc.page_count || 0} pages</span>
                    <span>{doc.covenant_count || 0} covenants extracted</span>
                    <span>{((doc.file_size_bytes || 0) / 1024 / 1024).toFixed(1)} MB</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
