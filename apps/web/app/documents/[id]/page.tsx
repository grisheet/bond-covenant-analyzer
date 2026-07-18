'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Clause {
  id: string;
  clause_type: { name: string; category: string };
  raw_text: string;
  normalized_value: string;
  confidence_score: number;
  review_status: string;
  page_number: number;
}

interface DocumentDetail {
  id: string;
  title: string;
  status: string;
  issuer_name: string;
  cusip: string;
  isin: string;
  governing_law: string;
  file_size_bytes: number;
  page_count: number;
  created_at: string;
  clauses: Clause[];
  metrics: Record<string, unknown>;
}

const CONFIDENCE_COLOR = (score: number) => {
  if (score >= 0.9) return 'text-green-400';
  if (score >= 0.7) return 'text-yellow-400';
  return 'text-red-400';
};

const REVIEW_BADGE: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  approved: 'bg-green-900 text-green-300',
  rejected: 'bg-red-900 text-red-300',
  flagged: 'bg-orange-900 text-orange-300',
};

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clauses' | 'metrics'>('clauses');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data) => { setDoc(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const triggerProcessing = async () => {
    setProcessing(true);
    try {
      await fetch(`/api/documents/${id}/process`, { method: 'POST' });
      setTimeout(() => window.location.reload(), 2000);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">Loading...</div>;
  if (!doc) return <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">Document not found</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/documents" className="text-gray-500 hover:text-gray-300 text-sm mb-2 block">
              ← Documents
            </Link>
            <h1 className="text-3xl font-bold">{doc.title}</h1>
            <p className="text-gray-400 mt-1">{doc.issuer_name}</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              {doc.cusip && <span>CUSIP: {doc.cusip}</span>}
              {doc.isin && <span>ISIN: {doc.isin}</span>}
              {doc.governing_law && <span>Law: {doc.governing_law}</span>}
              <span>{doc.page_count} pages</span>
            </div>
          </div>
          <div className="flex gap-3">
            {doc.status === 'pending' || doc.status === 'failed' ? (
              <button
                onClick={triggerProcessing}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {processing ? 'Queuing...' : 'Extract Covenants'}
              </button>
            ) : null}
            <Link
              href={`/chat?doc=${id}`}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Chat with Doc
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg w-fit">
          {(['clauses', 'metrics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-md font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Clauses Tab */}
        {activeTab === 'clauses' && (
          <div className="space-y-4">
            {doc.clauses.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                No covenants extracted yet. Click "Extract Covenants" to start.
              </div>
            ) : (
              doc.clauses.map((clause) => (
                <div key={clause.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-gray-800 px-2.5 py-1 rounded-full">{clause.clause_type?.category}</span>
                      <span className="font-medium">{clause.clause_type?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${CONFIDENCE_COLOR(clause.confidence_score)}`}>
                        {(clause.confidence_score * 100).toFixed(0)}% confidence
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${REVIEW_BADGE[clause.review_status] || 'bg-gray-800 text-gray-300'}`}>
                        {clause.review_status}
                      </span>
                    </div>
                  </div>
                  {clause.normalized_value && (
                    <p className="text-blue-300 font-mono text-sm mb-2">{clause.normalized_value}</p>
                  )}
                  <p className="text-gray-400 text-sm italic line-clamp-3">"{clause.raw_text}"</p>
                  <p className="text-xs text-gray-600 mt-2">Page {clause.page_number}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <pre className="text-sm text-gray-300 overflow-auto">
              {JSON.stringify(doc.metrics, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
