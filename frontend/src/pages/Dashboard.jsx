import React, { useState, useEffect } from 'react';
import api from '../api';
import AudioPlayer from '../components/AudioPlayer';
import UpgradeModal from '../components/UpgradeModal';
import { BookOpen, History, Send, Sparkles, Clock, Tag, LogOut, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard = () => {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(3);
  const [history, setHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState('');
  const navigate = useNavigate();

  const [examMode, setExamMode] = useState(false);
  const [textHighlighting, setTextHighlighting] = useState(false);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const [examStarted, setExamStarted] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const [config, setConfig] = useState(null);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    fetchUser();
    fetchHistory();
    fetchConfig();
    fetchActiveTopics();
  }, []);

  useEffect(() => {
    if (user && config && user.plan === 'trial') {
      const limit = config.daily_generation_limit || 5;
      if (user.daily_generations >= limit) {
        setShowUpgradeModal(true);
      }
    }
  }, [user, config]);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveTopics = async () => {
    try {
      const res = await api.get('/topics/active');
      setTopics(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get('/study/config');
      setConfig(res.data);
      if (res.data.allowed_durations?.length > 0) {
        setDuration(res.data.allowed_durations[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/study/history');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Strict Feature Validation from User Profile
    const userFeatures = user?.features || { exam_mode: false, text_highlight: false, duration_limit: 3 };

    if (examMode && !userFeatures.exam_mode) {
      setShowUpgradeModal(true);
      setLoading(false);
      return;
    }
    if (textHighlighting && !userFeatures.text_highlight) {
      setError("Text Highlighting is not enabled for your account. Please upgrade to unlock.");
      setLoading(false);
      return;
    }
    if (parseInt(duration) > userFeatures.duration_limit) {
      setError(`Your current limit is ${userFeatures.duration_limit} minutes. Please upgrade for longer durations.`);
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/study/generate', {
        prompt,
        system_prompt: systemPrompt,
        topic,
        duration_minutes: parseInt(duration),
        exam_mode: examMode,
        text_highlighting: textHighlighting
      });
      setCurrentSession(res.data);
      setExamStarted(false);
      setUserAnswers({});
      setExamSubmitted(false);
      setScore(0);
      setLastAction('Session generated successfully!');
      fetchHistory();
      fetchUser(); // Refresh daily count
      setPrompt('');
      setSystemPrompt('');
      setTopic('');
      setTimeout(() => setLastAction(''), 3000);
    } catch (err) {
      if (err.response?.data?.detail === "TRIAL_LIMIT_EXCEEDED") {
        setShowUpgradeModal(true);
      } else {
        setError(err.response?.data?.detail || 'Failed to generate study content');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await api.post('/auth/upgrade');
      await fetchUser();
      setShowUpgradeModal(false);
      setLastAction("Plan upgraded to PREMIUM! Enjoy unlimited access.");
      setTimeout(() => setLastAction(''), 3000);
    } catch (err) {
      setError("Upgrade failed. Please try again later.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Study.io</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.full_name || 'User'}</p>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
              <div style={{ color: 'var(--text-muted)' }}>Daily Generations</div>
              <div style={{ fontWeight: 'bold' }}>{user.daily_generations || 0} / {config?.daily_generation_limit || 5}</div>
            </div>
            <div className={`badge badge-${user.plan}`}>
              {user.plan.toUpperCase()} PLAN
            </div>
            {user.plan === 'trial' && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
              >
                <Zap size={16} fill="currentColor" /> Upgrade Plan
              </button>
            )}
            <ThemeToggle />
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                title="Admin Dashboard"
              >
                <Shield size={18} />
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: '0.5rem', minWidth: 'auto' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-2">
        <section>
          <div className="glass-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              <Sparkles size={20} color="var(--primary)" /> New Study Session
            </h2>

            {error && <div className="animate-fade-in" style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>{error}</div>}
            {lastAction && <div className="animate-fade-in" style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem' }}>{lastAction}</div>}

            <form onSubmit={handleGenerate}>
              <div className="input-group">
                <label><Tag size={14} /> Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                >
                  <option value="">Select a topic...</option>
                  {topics.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label><Clock size={14} /> Duration (Minutes)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {config?.allowed_durations?.map(d => {
                    const limit = user?.features?.duration_limit || 3;
                    const isAllowed = d <= limit;

                    return (
                      <option key={d} value={d} disabled={!isAllowed}>
                        {d} Minutes {!isAllowed && '🔒 (Upgrade to unlock)'}
                      </option>
                    );
                  })}
                </select>
                {/* Duration message removed in favor of locked option indicators */}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {config?.features_enabled?.exam_mode && (
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: !user?.features?.exam_mode ? 'not-allowed' : 'pointer',
                    opacity: !user?.features?.exam_mode ? 0.6 : 1
                  }}>
                    <input
                      type="checkbox"
                      checked={examMode}
                      onChange={(e) => setExamMode(e.target.checked)}
                      disabled={!user?.features?.exam_mode}
                    />
                    <span style={{ fontSize: '0.875rem' }}>
                      Exam Mode {!user?.features?.exam_mode && '🔒'}
                    </span>
                  </label>
                )}
                {config?.features_enabled?.text_highlighting && (
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: !user?.features?.text_highlight ? 'not-allowed' : 'pointer',
                    opacity: !user?.features?.text_highlight ? 0.6 : 1
                  }}>
                    <input
                      type="checkbox"
                      checked={textHighlighting}
                      onChange={(e) => setTextHighlighting(e.target.checked)}
                      disabled={!user?.features?.text_highlight}
                    />
                    <span style={{ fontSize: '0.875rem' }}>
                      Text Highlighting {!user?.features?.text_highlight && '🔒'}
                    </span>
                  </label>
                )}
              </div>

              <div className="input-group">
                <label><BookOpen size={14} /> System Prompt (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. You are a pirate teaching history..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label><BookOpen size={14} /> What do you want to study?</label>
                <textarea
                  rows="4"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: loading ? 'var(--glass-border)' : 'var(--primary)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                disabled={loading}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner-small" style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Processing Content...</span>
                  </div>
                ) : (
                  <><Send size={18} /> Generate Audio</>
                )}
              </button>
            </form>
          </div>

          {currentSession && currentSession.exam_mode && currentSession.questions && (
            <div className="glass-card animate-fade-in" style={{ marginTop: '2rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                <Shield size={20} color="var(--primary)" /> Exam: {currentSession.topic}
              </h2>

              {!examStarted ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                    Your exam with {currentSession.questions.length} questions is ready.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setExamStarted(true)}
                  >
                    Start Trial Exam
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {currentSession.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} style={{
                      padding: '1.5rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '1rem',
                      border: '1px solid var(--glass-border)'
                    }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem' }}>
                        {qIndex + 1}. {q.question}
                      </p>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {q.options.map((option, oIndex) => {
                          const questionId = q.id || qIndex.toString();
                          const isSelected = userAnswers[questionId] === option;
                          const isCorrect = q.correct_answer === option;
                          let backgroundColor = 'rgba(255,255,255,0.05)';
                          let borderColor = 'var(--glass-border)';

                          if (examSubmitted) {
                            if (isCorrect) {
                              backgroundColor = 'rgba(16, 185, 129, 0.2)';
                              borderColor = 'var(--success)';
                            } else if (isSelected && !isCorrect) {
                              backgroundColor = 'rgba(239, 68, 68, 0.2)';
                              borderColor = 'var(--error)';
                            }
                          } else if (isSelected) {
                            borderColor = 'var(--primary)';
                            backgroundColor = 'rgba(99, 102, 241, 0.1)';
                          }

                          return (
                            <button
                              key={oIndex}
                              disabled={examSubmitted}
                              onClick={() => setUserAnswers(prev => ({ ...prev, [questionId]: option }))}
                              style={{
                                padding: '1rem',
                                textAlign: 'left',
                                background: backgroundColor,
                                border: `2px solid ${borderColor}`,
                                borderRadius: '0.75rem',
                                color: 'var(--text-main)',
                                cursor: examSubmitted ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.95rem'
                              }}
                            >
                              <span style={{ marginRight: '0.75rem', fontWeight: 'bold', color: isSelected || (examSubmitted && isCorrect) ? 'inherit' : 'var(--text-muted)' }}>
                                {String.fromCharCode(65 + oIndex)}.
                              </span>
                              {option}
                              {examSubmitted && isCorrect && <span style={{ float: 'right', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>✓ Correct</span>}
                              {examSubmitted && isSelected && !isCorrect && <span style={{ float: 'right', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>✕ Your Choice</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!examSubmitted ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={Object.keys(userAnswers).length < currentSession.questions.length}
                      onClick={() => {
                        let newScore = 0;
                        currentSession.questions.forEach((q, qIndex) => {
                          const questionId = q.id || qIndex.toString();
                          if (userAnswers[questionId] === q.correct_answer) newScore++;
                        });
                        setScore(newScore);
                        setExamSubmitted(true);
                        setLastAction(`Exam submitted! You scored ${newScore}/${currentSession.questions.length}`);
                        setTimeout(() => setLastAction(''), 5000);
                      }}
                    >
                      Submit Exam
                    </button>
                  ) : (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      background: 'var(--glass-bg)',
                      borderRadius: '1rem',
                      border: '2px solid var(--primary)'
                    }}>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Exam Results</h3>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {score} / {currentSession.questions.length}
                      </p>
                      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {((score / currentSession.questions.length) * 100).toFixed(0)}% Score
                      </p>
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: '1.5rem' }}
                        onClick={() => {
                          setExamStarted(false);
                          setExamSubmitted(false);
                          setUserAnswers({});
                        }}
                      >
                        Retake Exam
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentSession && !currentSession.exam_mode && (
            <div style={{ marginTop: '2rem' }}>
              <AudioPlayer
                src={`http://localhost:8000${currentSession.audio_url}`}
                title={currentSession.topic}
                content={currentSession.content}
                speechMarks={currentSession.speech_marks}
                userPlan={user?.plan}
                listenCount={currentSession.listen_count}
                onPlayerError={() => {
                  if (user?.plan === 'trial') setShowUpgradeModal(true);
                }}
              />
            </div>
          )}
        </section>

        <section>
          <div className="glass-card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                <History size={20} color="var(--primary)" /> Recent History
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={dateFilter || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDateFilter(val);
                    // Refetch history with filter
                    const url = val ? `/study/history?date=${val}` : '/study/history';
                    api.get(url).then(res => setHistory(res.data)).catch(console.error);
                  }}
                  style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', fontSize: '0.75rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>{dateFilter ? 'No sessions found for this date.' : 'No history yet. Start your first session!'}</p>
              ) : (
                history.map((session, index) => (
                  <div
                    key={session.id}
                    className="glass-card history-item"
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      border: currentSession?.id === session.id ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                      animationDelay: `${index * 0.1}s`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                    onClick={() => {
                      setCurrentSession(session);
                      setShowHistoryDetail(session);
                      setShowFullExplanation(false);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{session.topic}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(session.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.prompt}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>{session.duration_minutes}m</span>
                      {session.exam_mode && <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', fontSize: '0.7rem', color: 'var(--primary)' }}>Exam</span>}
                    </div>
                  </div>
                ))
              )}

              {showHistoryDetail && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.8)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                  padding: '1rem'
                }} onClick={() => { setShowHistoryDetail(null); setShowFullExplanation(false); }}>
                  <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.5rem' }}>Session Details</h2>
                      <button className="btn btn-secondary" onClick={() => { setShowHistoryDetail(null); setShowFullExplanation(false); }} style={{ padding: '0.5rem', minWidth: 'auto' }}>✕</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Topic</label>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', fontWeight: 'bold' }}>{showHistoryDetail.topic}</div>
                      </div>

                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Prompt Used</label>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{showHistoryDetail.prompt}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>Date & Time</label>
                          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>{new Date(showHistoryDetail.created_at).toLocaleString()}</div>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>Duration</label>
                          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>{showHistoryDetail.duration_minutes} Minutes</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1, padding: '1rem', background: showHistoryDetail.exam_mode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Exam Mode</div>
                          <div style={{ fontWeight: 'bold', color: showHistoryDetail.exam_mode ? 'var(--primary)' : 'inherit' }}>{showHistoryDetail.exam_mode ? 'ENABLED' : 'DISABLED'}</div>
                        </div>
                        <div style={{ flex: 1, padding: '1rem', background: showHistoryDetail.text_highlighting ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Text Highlighting</div>
                          <div style={{ fontWeight: 'bold', color: showHistoryDetail.text_highlighting ? 'var(--success)' : 'inherit' }}>{showHistoryDetail.text_highlighting ? 'ENABLED' : 'DISABLED'}</div>
                        </div>
                      </div>

                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Study Content / Explanation</label>
                        <div style={{
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--glass-border)',
                          maxHeight: showFullExplanation ? 'none' : '200px',
                          overflowY: 'auto',
                          position: 'relative',
                          fontSize: '0.95rem',
                          lineHeight: '1.6'
                        }}>
                          {showHistoryDetail.content ? (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              {showHistoryDetail.content}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                              Study content not available for this session
                            </div>
                          )}
                        </div>
                        {showHistoryDetail.content && showHistoryDetail.content.length > 300 && (
                          <button
                            className="btn btn-secondary"
                            style={{
                              marginTop: '0.5rem',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              padding: '0.2rem 0',
                              fontSize: '0.85rem'
                            }}
                            onClick={() => setShowFullExplanation(!showFullExplanation)}
                          >
                            {showFullExplanation ? 'Hide explanation' : 'Show full explanation'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        loading={upgrading}
      />
    </div>
  );
};

export default Dashboard;
