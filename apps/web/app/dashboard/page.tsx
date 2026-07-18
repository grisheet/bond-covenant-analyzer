'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, AlertTriangle, CheckCircle, Clock, TrendingUp, Upload } from 'lucide-react';

interface KPIData {
  totalDocuments: number;
  documentsThisMonth: number;
  totalClauses: number;
  clausesPendingReview: number;
  avgConfidenceScore: number;
  flaggedClauses: number;
}

interface RecentDocument {
  id: string;
  filename: string;
  status: string;
  clauseCount: number;
  flagCount: number;
  processedAt: string;
  issuer: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [kpiRes, docsRes] = await Promise.all([
          fetch('/api/dashboard/kpis'),
          fetch('/api/documents?limit=5'),
        ]);
        const kpiData = await kpiRes.json();
        const docsData = await docsRes.json();
        setKpis(kpiData);
        setRecentDocuments(docsData.documents || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      processed: 'bg-green-900 text-green-300',
      processing: 'bg-yellow-900 text-yellow-300',
      failed: 'bg-red-900 text-red-300',
      pending: 'bg-gray-700 text-gray-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Covenant Intelligence Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor document processing and covenant extraction status</p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Documents
        </Link>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <span className="text-gray-400 text-xs">Total Documents</span>
            </div>
            <p className="text-2xl font-semibold text-white">{kpis.totalDocuments}</p>
            <p className="text-xs text-gray-500 mt-1">+{kpis.documentsThisMonth} this month</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-gray-400 text-xs">Total Clauses</span>
            </div>
            <p className="text-2xl font-semibold text-white">{kpis.totalClauses.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Across all documents</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-gray-400 text-xs">Pending Review</span>
            </div>
            <p className="text-2xl font-semibold text-white">{kpis.clausesPendingReview}</p>
            <p className="text-xs text-gray-500 mt-1">Requires analyst attention</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-gray-400 text-xs">Avg Confidence</span>
            </div>
            <p className="text-2xl font-semibold text-white">{(kpis.avgConfidenceScore * 100).toFixed(0)}%</p>
            <p className="text-xs text-gray-500 mt-1">AI extraction accuracy</p>
          </div>
        </div>
      )}

      {/* Flagged Clauses Alert */}
      {kpis && kpis.flaggedClauses > 0 && (
        <div className="bg-amber-950 border border-amber-800 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-amber-300 font-medium text-sm">
              {kpis.flaggedClauses} clause{kpis.flaggedClauses > 1 ? 's' : ''} flagged for review
            </p>
            <p className="text-amber-500 text-xs mt-0.5">
              Low confidence scores or ambiguous language detected — analyst review required
            </p>
          </div>
        </div>
      )}

      {/* Recent Documents */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-medium text-white">Recent Documents</h2>
          <Link href="/documents" className="text-xs text-blue-400 hover:text-blue-300">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {recentDocuments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No documents yet.{' '}
              <Link href="/upload" className="text-blue-400 hover:text-blue-300">
                Upload your first document
              </Link>
            </div>
          ) : (
            recentDocuments.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-white font-medium truncate max-w-xs">{doc.filename}</p>
                    <p className="text-xs text-gray-500">{doc.issuer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {statusBadge(doc.status)}
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{doc.clauseCount} clauses</p>
                    {doc.flagCount > 0 && (
                      <p className="text-xs text-amber-400">{doc.flagCount} flagged</p>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
