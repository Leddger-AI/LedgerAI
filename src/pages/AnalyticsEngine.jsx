import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, TrendingUp, Award, Target } from 'lucide-react';
import '../LandingPage.css';

export default function AnalyticsEngine() {
  const location = useLocation();
  const navigate = useNavigate();
  const csvData = location.state?.csvData || [];

  // Data processing engine
  const processedData = csvData
    .filter(row => row.Name) // Simple validation
    .map(row => {
      const exp = parseInt(row.Experience) || 0;
      const rawScore = parseInt(row.Score) || 0;
      // Analytics Algorithm: Fit Score = (Raw Score * 0.7) + (Experience * 6)
      const fitScore = Math.min(100, Math.round((rawScore * 0.7) + (exp * 6)));
      
      return {
        name: row.Name,
        idea: row.Idea || 'N/A',
        experience: exp,
        rawScore: rawScore,
        fitScore: fitScore
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore); // Rank best first

  const topCandidate = processedData.length > 0 ? processedData[0] : null;

  return (
    <div className="lp-wrapper" style={{ minHeight: '100vh', backgroundColor: '#1A1D1D', color: '#ffffff' }}>
      <nav className="cz-navbar" style={{ backgroundColor: '#2B2E2E', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px' }}>
        <div className="cz-logo" style={{ color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/recruiter-flow')}>
          <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back to Recruiter Dashboard
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 40px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <TrendingUp size={32} color="#f25530" />
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.02em' }}>Recruitment Analytics Engine</h1>
        </div>

        {processedData.length === 0 ? (
          <div style={{ backgroundColor: '#2B2E2E', padding: '60px', textAlign: 'center', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Target size={48} color="rgba(255, 255, 255, 0.4)" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '24px', color: '#ffffff' }}>No Data Loaded</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '10px' }}>Upload a CSV file in the Recruiter Dashboard to run analytics.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* Top Insight Block (Charcoal Theme Card) */}
            <section className="cz-alt-section" style={{ padding: '40px', borderRadius: '16px', backgroundColor: '#2B2E2E', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', color: '#ffffff' }}>
              <div className="cz-alt-container">
                <div className="cz-alt-text">
                  <h2 className="cz-alt-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '16px' }}>
                    <Award color="#D7FEFA" size={32} /> The Top Candidate Is: {topCandidate.name}
                  </h2>
                  <p className="cz-alt-desc" style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                    Based on our algorithm analyzing raw scores and experience factors, <strong>{topCandidate.name}</strong> achieved the highest overall Fit Score of <strong style={{color: '#f25530'}}>{topCandidate.fitScore}/100</strong>.
                  </p>
                  <div style={{ marginTop: '20px', backgroundColor: '#1A1D1D', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ marginBottom: '8px', color: '#ffffff' }}><strong>Project Idea:</strong> {topCandidate.idea}</div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                      <span style={{ backgroundColor: '#2B2E2E', border: '1px solid rgba(255,255,255,0.08)', color: '#D7FEFA', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                        Raw Score: {topCandidate.rawScore}
                      </span>
                      <span style={{ backgroundColor: '#2B2E2E', border: '1px solid rgba(255,255,255,0.08)', color: '#D7FEFA', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                        Experience: {topCandidate.experience} yrs
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Chart Block */}
            <section style={{ backgroundColor: '#2B2E2E', padding: '40px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '30px', textAlign: 'center' }}>
                Candidate Fit Score Distribution
              </h2>
              
              <div style={{ width: '100%', height: '400px', backgroundColor: '#1A1D1D', padding: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.7)" tick={{ fill: 'rgba(255, 255, 255, 0.7)' }} />
                    <YAxis stroke="rgba(255, 255, 255, 0.7)" tick={{ fill: 'rgba(255, 255, 255, 0.7)' }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#2B2E2E', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                      itemStyle={{ color: '#D7FEFA' }}
                    />
                    <Bar dataKey="fitScore" radius={[4, 4, 0, 0]}>
                      {processedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f25530' : '#88c8cc'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
