// // === Batch 09 Gaps & Frontend Mounts ===
import React, { useState } from 'react';
import AIReport from '../../components/AIReport';

export default function StrategicPartnerRecommendationEnginePage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const r = await fetch('/api/custom/strategic-partner-recommendation-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ prompt: input })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (e) { setError(e.message || 'Error'); }
    setLoading(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Strategic partner recommendation engine</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>Generated gap feature for alliance.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {[
          ['Operational review', 'Review a fictional operational scenario for Strategic partner recommendation engine. A small delivery team has a 14-day deadline, two available specialists, and one unresolved dependency. Identify assumptions, risks, owners, and next steps.'],
          ['Planning scenario', 'Prepare a planning report for Strategic partner recommendation engine. Compare a conservative option with a faster option for an illustrative $2,400 budget. Include required evidence, dependencies, and a practical decision timeline.'],
          ['Executive brief', 'Draft an executive brief for Strategic partner recommendation engine using illustrative inputs only. Summarize three priorities, tradeoffs, missing information, and recommended decisions for a leadership review.'],
        ].map(([label, example]) => <button key={label} type="button" disabled={loading} onClick={() => setInput(example)} style={{ padding: '8px 12px', border: '1px solid #93c5fd', borderRadius: 6, background: '#fff', color: '#1e3a8a' }}>Fill · {label}</button>)}
      </div>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Describe what you need..."
        rows={6}
        style={{ width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 6, marginBottom: 12 }}
      />
      <button
        onClick={run}
        disabled={loading}
        style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        {loading ? 'Running...' : 'Run AI'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      {result !== null && <AIReport response={result} title="Strategic partner recommendation engine" />}
    </div>
  );
}
