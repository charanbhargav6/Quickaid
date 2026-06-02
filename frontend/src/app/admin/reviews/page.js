'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ReviewsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:reporter_id(full_name, role),
          reported:reported_user_id(full_name, role)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function resolveReport(id) {
    try {
      await supabase.from('user_reports').update({ status: 'resolved' }).eq('id', id);
      fetchReports();
    } catch (e) { console.error(e); }
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }} className="fade-in">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Trust & Safety (Reports)</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Monitor user reports, resolve disputes, and manage platform safety.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>DATE</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>REPORTER</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>REPORTED USER</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>REASON / DETAILS</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>STATUS</th>
              <th style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="skeleton skeleton-row"></div><div className="skeleton skeleton-row"></div></td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No reports filed yet. The community is safe!</td></tr>
            ) : (
              reports.map(report => (
                <tr key={report.id} style={{ borderBottom: '1px solid var(--border)', background: report.status === 'pending' ? 'var(--orange-50)' : 'transparent' }}>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                    {report.reporter?.full_name || 'Unknown'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: 'var(--red-600)' }}>
                    {report.reported?.full_name || 'Unknown'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{report.reason}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px' }}>{report.details}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      background: report.status === 'resolved' ? 'var(--green-100)' : 'var(--orange-100)',
                      color: report.status === 'resolved' ? 'var(--green-700)' : 'var(--orange-700)'
                    }}>
                      {report.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {report.status === 'pending' && (
                      <button 
                        onClick={() => resolveReport(report.id)}
                        className="btn btn-outline" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
