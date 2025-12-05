import React, { useState, useEffect } from 'react';
import API_URL from './config';

export default function UserDashboard() {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [userReply, setUserReply] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allReviews, setAllReviews] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const res = await fetch(`${API_URL}/submissions`);
      const data = await res.json();
      setAllReviews(data.reverse());
    };
    fetchAll();
    const id = setInterval(fetchAll, 10000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setUserReply(null);
    const res = await fetch(`${API_URL}/submit_review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, review })
    });
    const data = await res.json();
    setUserReply(data.user_reply);
    setReview('');
    setRating(5);
    setLoading(false);
    // Refresh reviews immediately
    const res2 = await fetch(`${API_URL}/submissions`);
    const all = await res2.json();
    setAllReviews(all.reverse());
  };

  // Calculate analytics
  const avgRating = allReviews.length
    ? (allReviews.reduce((s, x) => s + (x.rating || 0), 0) / allReviews.length).toFixed(2)
    : '0.00';
  const ratingCounts = [5, 4, 3, 2, 1].map(star =>
    allReviews.filter(s => s.rating === star).length
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #1a1a1a 50%, #2d2d2d 50%, #2d2d2d 100%)',
      backgroundSize: '100% 100%',
      padding: '40px 20px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(255, 68, 68, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 68, 68, 0.03) 0%, transparent 50%)',
        pointerEvents: 'none',
      }}></div>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Main Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: 40,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 8px 25px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
        }}>
          <h2 style={{
            color: '#1a1a1a', fontWeight: 800, textAlign: 'center',
            marginBottom: 30, fontSize: 36, letterSpacing:'-0.5px',
          }}>🌟 Share Your Experience</h2>

          {/* Stats Section */}
          {allReviews.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 16,
              marginBottom: 32,
              padding: '24px',
              background: 'rgba(250, 250, 250, 0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}>
              <div style={{
                textAlign: 'center',
                padding: '18px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              }}>
                <div style={{fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginBottom: 4}}>
                  {avgRating}
                </div>
                <div style={{fontSize: 13, color: '#666', fontWeight: 600}}>Average Rating</div>
              </div>
              {[5, 4, 3, 2, 1].map((star, idx) => (
                <div key={star} style={{
                  textAlign: 'center',
                  padding: '18px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                }}>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: idx === 4 ? '#ff4444' : '#1a1a1a',
                    marginBottom: 4
                  }}>
                    {ratingCounts[idx]}
                  </div>
                  <div style={{fontSize: 13, color: '#666', fontWeight: 600}}>
                    {star}⭐ Reviews
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSubmit} style={{marginBottom: 30}}>
        <div style={{
          marginBottom: 20, display:'flex', alignItems:'center', fontWeight:600
        }}>
          <label style={{marginRight: 12, color:'#1a1a1a', fontSize: 15}}>Rating:</label>
          <div style={{display:"flex", gap:4}}>
            {[1,2,3,4,5].map(star => (
              <span key={star}
                onClick={()=>setRating(star)}
                style={{
                  fontSize:28,
                  color: star<=rating ? '#ff4444' : '#d0d0d0',
                  cursor:'pointer',
                  transition: 'color 0.2s',
                }}>★
              </span>
            ))}
          </div>
        </div>
            <div style={{marginBottom: 20}}>
              <textarea
                value={review}
                onChange={e => setReview(e.target.value)}
                rows={5}
                placeholder="Leave your honest feedback here..."
                required
                style={{
                  width:"100%",
                  borderRadius: '12px',
                  border: '2px solid #e5e5e5',
                  padding: '16px 18px',
                  fontSize: 15,
                  background: 'rgba(255, 255, 255, 0.9)',
                  resize: "vertical",
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff4444';
                  e.target.style.boxShadow = '0 4px 20px rgba(255, 68, 68, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e5e5';
                  e.target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !review}
              style={{
                width: '100%',
                background: loading ? '#999' : '#ff4444',
                color: 'white', border: 'none',
                borderRadius: '12px', padding: '16px 32px', fontSize: 18,
                fontWeight:700, cursor: loading ? 'not-allowed':'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 20px rgba(255, 68, 68, 0.4)',
              }}
              onMouseOver={(e) => !loading && (e.target.style.background = '#e63939', e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 6px 25px rgba(255, 68, 68, 0.5)')}
              onMouseOut={(e) => !loading && (e.target.style.background = '#ff4444', e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 20px rgba(255, 68, 68, 0.4)')}
            >
              {loading ? '⏳ Sending...' : '✨ Submit Review'}
            </button>
          </form>

          {/* User's AI Reply */}
          {userReply && (
            <div style={{
              marginBottom: 28,
              padding: 20,
              background: 'rgba(255, 68, 68, 0.05)',
              borderRadius: '16px',
              border: '2px solid rgba(255, 68, 68, 0.2)',
              boxShadow: '0 4px 20px rgba(255, 68, 68, 0.1)',
            }}>
              <span style={{color:'#ff4444', fontWeight:700, fontSize:16, display:'block', marginBottom:10}}>
                💬 AI Response to Your Review:
              </span>
              <div style={{fontSize: 15, color:'#1a1a1a', lineHeight:'1.6'}}>
                {userReply}
              </div>
            </div>
          )}

          {/* Community Testimonials */}
          <h3 style={{
            marginTop: 10, marginBottom: 18, color: '#1a1a1a', fontWeight:700, fontSize: 22
          }}>
            💭 Community Testimonials
          </h3>
          <div style={{
            maxHeight: 400,
            overflowY: 'auto',
            background: 'rgba(250, 250, 250, 0.8)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: "24px"
          }}>
            {allReviews.length === 0 && (
              <div style={{
                color:'#888', textAlign:'center', fontStyle:'italic', marginTop:30, fontSize:14
              }}>
                There are no reviews yet. Be the first!
              </div>
            )}
            {allReviews.map((rev, idx) => (
              <div key={idx} style={{
                marginBottom: 20,
                paddingBottom: 20,
                borderBottom: idx < allReviews.length - 1 ? '1px solid #e5e5e5' : 'none',
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8}}>
                  <div>
                    <span style={{
                      color:'#ff4444', fontWeight:700, fontSize:18,
                      letterSpacing:"1px"
                    }}>
                      {'★'.repeat(rev.rating)}
                      <span style={{
                        opacity:0.2,
                        fontWeight:700
                      }}>{'★'.repeat(5-rev.rating)}</span>
                    </span>
                  </div>
                  <div style={{fontSize:11, color:'#888', fontWeight:400}}>
                    {rev.timestamp && new Date(rev.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight:400, margin:'8px 0', color:'#1a1a1a',
                  lineHeight:'1.6'
                }}>
                  {rev.review}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}