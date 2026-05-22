import { useState } from 'react'
import { FileText, Download, ExternalLink } from 'lucide-react'

export default function StatusBriefPDFView() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')

  const fetchPdf = async (open = false) => {
    setLoading(true); setError(''); setPdfUrl('')
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('/api/custom-views/status-brief.pdf', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      if (open) {
        const a = document.createElement('a')
        a.href = url
        a.download = 'alliance-status-brief.pdf'
        a.click()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-rose-600" />
        <h3 className="text-base font-semibold text-slate-800">Alliance Status Brief (PDF)</h3>
      </div>

      <p className="mb-3 text-sm text-slate-600">
        Generate a one-page alliance brief covering partner counts, recent activities, and risk posture.
        Useful for weekly governance circulation.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fetchPdf(false)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          {loading ? 'Generating…' : 'Generate Brief'}
        </button>
        <button
          onClick={() => fetchPdf(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" /> Open in tab
          </a>
        )}
      </div>

      {error && <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {pdfUrl && (
        <div className="mt-4">
          <iframe title="Alliance Brief" src={pdfUrl} className="h-72 w-full rounded border border-slate-200" />
        </div>
      )}
    </div>
  )
}
