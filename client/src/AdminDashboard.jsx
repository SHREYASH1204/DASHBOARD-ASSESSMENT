import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import API_URL from './config';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState({ type: null, value: null });
  const [groupAction, setGroupAction] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`${API_URL}/submissions`);
      const data = await res.json();
      setSubmissions(data.reverse());
    };
    fetchData();
    const id = setInterval(fetchData, 3000);
    return () => clearInterval(id);
  }, []);

  // Analytics
  const avgRating = submissions.length
    ? (submissions.reduce((s, x) => s + (x.rating || 0), 0) / submissions.length).toFixed(2)
    : '-';
  const ratingCounts = [5, 4, 3, 2, 1].map(star =>
    submissions.filter(s => s.rating === star).length
  );
  const byDay = {};
  submissions.forEach(s => {
    const day = s.timestamp ? new Date(s.timestamp).toLocaleDateString() : '';
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(s);
  });

  // Filtering logic
  let filtered = submissions;
  let filterLabel = "";
  if (filter.type === "rating") {
    filtered = submissions.filter(s => s.rating === filter.value);
    filterLabel = <>Showing only <b>{filter.value}⭐ reviews</b></>;
  }
  if (filter.type === "date") {
    filtered = (byDay[filter.value] || []);
    filterLabel = <>Showing only reviews from <b>{filter.value}</b></>;
  }

  // Group LLM summary
  useEffect(() => {
    if (filter.type === "rating" && filtered.length > 0) {
      setGroupAction(""); setLoadingAction(true);
      fetch(`${API_URL}/star_summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: filtered.map(r => r.review), rating: filter.value })
      })
      .then(res => res.json())
      .then(data => {
        setGroupAction(data.group_action || "(No LLM response)");
        setLoadingAction(false);
      })
      .catch(() => { setGroupAction("(No LLM response)"); setLoadingAction(false); });
    } else {
      setGroupAction("");
    }
    // eslint-disable-next-line
  }, [filter]);

  // Plot Data - Original colorful theme
  const pieColors = ['#009e4e', '#51ace6', '#ffcb31', '#ff846b', '#ef2d36'];
  const pieLabels = ["5⭐", "4⭐", "3⭐", "2⭐", "1⭐"];

  // Card style for charts - Beautiful glassmorphism
  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 8px 32px rgba(66, 81, 186, 0.12), 0 2px 8px rgba(66, 81, 186, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      padding: '40px 20px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
    }}>
      
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header Section */}
        <div style={{
          ...cardStyle,
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 24px 0',
            letterSpacing: '-0.5px',
          }}>
            📊 Admin Review Dashboard
          </h1>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '18px 32px',
              borderRadius: '12px',
              fontSize: '17px',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
            }}>
              📝 Total Reviews: <span style={{fontSize: '26px', marginLeft: '8px', fontWeight: 800}}>{submissions.length}</span>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              padding: '18px 32px',
              borderRadius: '12px',
              fontSize: '17px',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(240, 147, 251, 0.4)',
            }}>
              ⭐ Average Rating: <span style={{fontSize: '26px', marginLeft: '8px', fontWeight: 800}}>{avgRating}</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '28px',
          marginBottom: '32px',
        }}>
          {/* Bar Chart Card */}
          <div style={{
            ...cardStyle,
            gridColumn: 'span 2',
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#2d3748',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                width: '4px',
                height: '24px',
                borderRadius: '2px',
              }}></span>
              Review Distribution by Star Rating
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '20px',
              fontStyle: 'italic',
            }}>
              💡 Click any bar to filter reviews by that rating
            </p>
            <div style={{
              background: 'rgba(250, 250, 250, 0.8)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <Plot
                data={[{
                  x: [5, 4, 3, 2, 1],
                  y: ratingCounts,
                  type: 'bar',
                  marker: {
                    color: pieColors,
                    line: { width: 2, color: '#fff' },
                    opacity: 0.9,
                  },
                  hoverinfo: 'y',
                }]}
                layout={{
                  margin: { t: 20, b: 50, l: 70, r: 20 },
                  height: 320,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  xaxis: {
                    title: { text: 'Star Rating', font: { size: 13, color: '#666' } },
                    tickvals: [1, 2, 3, 4, 5],
                    gridcolor: 'rgba(0,0,0,0.08)',
                  },
                  yaxis: {
                    title: { text: 'Review Count', font: { size: 13, color: '#666' } },
                    rangemode: 'tozero',
                    gridcolor: 'rgba(0,0,0,0.08)',
                  },
                }}
                config={{ displayModeBar: false }}
                onClick={data => {
                  if (data.points.length === 1) setFilter({ type: "rating", value: data.points[0].x });
                }}
              />
            </div>
          </div>

          {/* Pie Chart Card */}
          <div style={cardStyle}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#2d3748',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                width: '4px',
                height: '24px',
                borderRadius: '2px',
              }}></span>
              Rating Proportions
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '20px',
              fontStyle: 'italic',
            }}>
              💡 Click a slice to filter by that rating
            </p>
            <div style={{
              background: 'rgba(250, 250, 250, 0.8)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <Plot
                data={[{
                  values: ratingCounts,
                  labels: pieLabels,
                  type: 'pie',
                  marker: { colors: pieColors },
                  textinfo: "percent+label",
                  textfont: { size: 13 },
                  hole: 0.4,
                }]}
                layout={{
                  margin: { t: 20, b: 20, l: 20, r: 20 },
                  height: 320,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  legend: { font: { size: 12 }, x: 0.5, y: -0.1, orientation: 'h' },
                }}
                config={{ displayModeBar: false }}
                onClick={data => {
                  if (data.points.length === 1) {
                    const starVal = parseInt(data.points[0].label);
                    setFilter({ type: "rating", value: starVal });
                  }
                }}
              />
            </div>
          </div>

          {/* Timeline Chart Card */}
          <div style={cardStyle}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#2d3748',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                width: '4px',
                height: '24px',
                borderRadius: '2px',
              }}></span>
              Reviews Over Time
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#718096',
              marginBottom: '20px',
              fontStyle: 'italic',
            }}>
              💡 Click a date point to see reviews from that day
            </p>
            <div style={{
              background: 'rgba(250, 250, 250, 0.8)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <Plot
                data={[{
                  x: Object.keys(byDay),
                  y: Object.values(byDay).map(arr => arr.length),
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: {
                    color: '#667eea',
                    size: 14,
                    line: { color: '#fff', width: 2 },
                  },
                  line: { color: '#667eea', width: 3 },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(102, 126, 234, 0.2)',
                }]}
                layout={{
                  margin: { t: 20, b: 60, l: 50, r: 20 },
                  height: 320,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  xaxis: {
                    title: { text: 'Date', font: { size: 14, color: '#4a5568' } },
                    tickangle: -25,
                    gridcolor: 'rgba(0,0,0,0.05)',
                  },
                  yaxis: {
                    title: { text: 'Reviews', font: { size: 14, color: '#4a5568' } },
                    gridcolor: 'rgba(0,0,0,0.05)',
                  },
                }}
                config={{ displayModeBar: false }}
                onClick={data => {
                  if (data.points.length === 1) {
                    setFilter({ type: "date", value: data.points[0].x });
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Filter Info Panel */}
        {filter.type && (
          <div style={{
            ...cardStyle,
            marginBottom: '32px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            border: '2px solid rgba(102, 126, 234, 0.3)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#2d3748',
              }}>
                {filterLabel}
              </div>
              <button
                onClick={() => setFilter({ type: null, value: null })}
                style={{
                  background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                ✕ Clear Filter
              </button>
            </div>
            {filter.type === "rating" && (
              <div style={{
                fontSize: '15px',
                color: '#4a5568',
                lineHeight: '1.6',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '12px',
              }}>
                {loadingAction ? (
                  <span style={{ fontStyle: 'italic', color: '#718096' }}>
                    ⏳ Generating AI-powered insights...
                  </span>
                ) : (
                  <span>{groupAction}</span>
                )}
              </div>
            )}
            {filter.type === "date" && (
              <div style={{
                fontSize: '15px',
                color: '#4a5568',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '12px',
              }}>
                📅 Found <b>{filtered.length}</b> review{filtered.length !== 1 ? 's' : ''} on this date.
              </div>
            )}
          </div>
        )}

        {/* Review Table Card */}
        <div style={cardStyle}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#2d3748',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              width: '4px',
              height: '28px',
              borderRadius: '2px',
            }}></span>
            Review Details
          </h3>
          <div style={{
            overflowX: 'auto',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              background: '#fff',
            }}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Rating</th>
                  <th style={thStyle}>Review</th>
                  <th style={thStyle}>User Reply</th>
                  <th style={thStyle}>AI Summary</th>
                  <th style={thStyle}>AI Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{
                      ...tdStyle,
                      textAlign: 'center',
                      padding: '40px',
                      color: '#a0aec0',
                      fontStyle: 'italic',
                    }}>
                      No reviews match the current filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? '#fafafa' : '#ffffff',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fafafa' : '#ffffff'}
                    >
                      <td style={tdStyle}>{s.timestamp && new Date(s.timestamp).toLocaleString()}</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '14px',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                        }}>
                          {s.rating} ⭐
                        </span>
                      </td>
                      <td style={tdStyle}>{s.review}</td>
                      <td style={tdStyle}>{s.user_reply}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          background: '#d8e4fc',
                          color: '#1a1a1a',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}>
                          {s.ai_summary}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          background: '#ffe6b3',
                          color: '#1a1a1a',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}>
                          {s.ai_actions}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  fontWeight: 700,
  fontSize: '15px',
  padding: '16px 14px',
  textAlign: 'left',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
};

const tdStyle = {
  padding: '12px',
  fontSize: '13px',
  maxWidth: '250px',
  verticalAlign: 'top',
  borderBottom: '1px solid #e5e5e5',
  color: '#1a1a1a',
  lineHeight: '1.5',
};