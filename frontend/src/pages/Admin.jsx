import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Users, Settings, BarChart3, Shield, Plus, Save,
  LogOut, Database, Clock, Activity, CreditCard,
  MessageSquare, ChevronRight, CheckCircle2, AlertCircle, History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [usage, setUsage] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [promptEditingTopic, setPromptEditingTopic] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, configRes, usageRes, sessionsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/config'),
        api.get('/admin/usage-report'),
        api.get('/admin/sessions')
      ]);
      setUsers(usersRes.data || []);
      setConfig(configRes.data);
      setUsage(usageRes.data);
      setSessions(sessionsRes.data || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        navigate('/dashboard');
      } else {
        setError('Failed to load admin data. Please ensure you have admin privileges.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (updates) => {
    try {
      const res = await api.put('/admin/config', updates);
      setConfig(res.data);
      showSuccess('Configuration updated successfully!');
    } catch (err) {
      console.error(err);
      showSuccess('Update failed. Permission denied?');
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const res = await api.put(`/admin/users/${userId}`, updates);
      showSuccess('User updated successfully!');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...res.data } : u));
      if (editingUser?.id === userId) {
        setEditingUser(prev => ({ ...prev, ...res.data }));
      }
      fetchData();
    } catch (err) {
      console.error(err);
      showSuccess('Failed to update user');
    }
  };

  const fetchUserHistoryByAdmin = async (userId) => {
    setFetchingHistory(true);
    try {
      const res = await api.get(`/admin/users/${userId}/history`);
      setUserHistory(res.data || []);
    } catch (err) {
      console.error(err);
      showSuccess('Failed to fetch user history');
    } finally {
      setFetchingHistory(false);
    }
  };

  const toggleUserManagement = (user) => {
    if (editingUser?.id === user.id) {
      setEditingUser(null);
      setUserHistory([]);
    } else {
      setEditingUser(user);
      setUserHistory([]);
      fetchUserHistoryByAdmin(user.id);
    }
  };

  const handleUpdateTopicPrompt = (topicName, newTemplate) => {
    const updatedTopics = (config?.topics || []).map(t =>
      t.name === topicName ? { ...t, prompt_template: newTemplate } : t
    );
    handleUpdateConfig({ topics: updatedTopics });
    setPromptEditingTopic(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'config', name: 'App Config', icon: Settings },
    { id: 'users', name: 'User Management', icon: Users },
  ];

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="animate-fade-in" style={{ textAlign: 'center' }}>
          <Activity className="animate-pulse" size={48} color="var(--primary)" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading Admin Control Center...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="glass-card animate-fade-in" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} color="var(--error)" style={{ marginBottom: '1rem' }} />
          <h2>Access Denied</h2>
          <p style={{ margin: '1rem 0', color: 'var(--text-muted)' }}>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      {successMsg && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          background: successMsg.includes('failed') ? 'var(--error)' : 'var(--success)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '1rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          {successMsg.includes('failed') ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />} {successMsg}
        </div>
      )}

      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Shield size={32} color="var(--primary)" /> Admin Center
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage platform configuration and monitor system usage</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Dashboard
          </button>
          <ThemeToggle />
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem', minWidth: 'auto' }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-card stat-card stat-blue">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Sessions</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '2rem' }}>{(usage?.summary?.total_sessions || 0).toLocaleString()}</h2>
                  <Activity color="#3b82f6" opacity={0.5} size={32} />
                </div>
              </div>
              <div className="glass-card stat-card stat-green">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Usage Cost</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '2rem' }}>${(usage?.summary?.total_cost || 0).toFixed(2)}</h2>
                  <CreditCard color="#10b981" opacity={0.5} size={32} />
                </div>
              </div>
              <div className="glass-card stat-card stat-purple">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>AI Tokens Used</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '2rem' }}>{(usage?.summary?.total_openai_tokens || 0).toLocaleString()}</h2>
                  <MessageSquare color="#8b5cf6" opacity={0.5} size={32} />
                </div>
              </div>
              <div className="glass-card stat-card stat-orange">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Users</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '2rem' }}>{users?.length || 0}</h2>
                  <Users color="#f59e0b" opacity={0.5} size={32} />
                </div>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '1.5rem' }}>
              <div className="glass-card">
                <h2 className="admin-section-header">Recent Platform Activity</h2>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th>Usage</th>
                        <th>Cost</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sessions || []).slice(0, 5).map((s, i) => (
                        <tr key={s.id || s._id || i} className="history-item" style={{ animationDelay: `${i * 0.1}s` }}>
                          <td>{s.topic}</td>
                          <td>{(s.openai_tokens || 0).toLocaleString()} tks</td>
                          <td style={{ color: 'var(--success)' }}>${(s.estimated_cost || 0).toFixed(4)}</td>
                          <td>{new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-card">
                <h2 className="admin-section-header">Quick Prompt Editor</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  The topics below are fixed. Click a subject to instantly edit its AI Tutor prompt template.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {(config?.topics || []).map((t, idx) => (
                    <button
                      key={idx}
                      className="glass-card"
                      style={{
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: '600',
                        color: 'white'
                      }}
                      onClick={() => setPromptEditingTopic(t)}
                    >
                      <Database size={16} color="var(--primary)" />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {promptEditingTopic && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1100, padding: '1.5rem'
          }} onClick={() => setPromptEditingTopic(null)}>
            <div className="glass-card animate-fade-in" style={{ maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Edit {promptEditingTopic.name} Prompt</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Define the style and scope of the AI Tutor.</p>
                </div>
                <button className="btn btn-secondary" onClick={() => setPromptEditingTopic(null)} style={{ padding: '0.5rem', minWidth: 'auto' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <textarea
                  defaultValue={promptEditingTopic.prompt_template}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                    padding: '1.25rem',
                    borderRadius: '0.75rem',
                    minHeight: '250px',
                    outline: 'none',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    fontFamily: 'monospace'
                  }}
                  id="topic-prompt-editor"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setPromptEditingTopic(null)}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const newVal = document.getElementById('topic-prompt-editor').value;
                      handleUpdateTopicPrompt(promptEditingTopic.name, newVal);
                    }}
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-2 animate-fade-in">
            <section className="glass-card">
              <h2 className="admin-section-header">Platform Limits</h2>
              {config && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div className="input-group">
                    <label>Trial Session Limit</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input
                        type="number"
                        value={config.trial_limit_sessions}
                        onChange={(e) => setConfig({ ...config, trial_limit_sessions: parseInt(e.target.value) })}
                      />
                      <button className="btn btn-primary" onClick={() => handleUpdateConfig({ trial_limit_sessions: config.trial_limit_sessions })}>
                        Update
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Trial Max Duration (Min)</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input
                        type="number"
                        value={config.trial_max_duration}
                        onChange={(e) => setConfig({ ...config, trial_max_duration: parseInt(e.target.value) })}
                      />
                      <button className="btn btn-primary" onClick={() => handleUpdateConfig({ trial_max_duration: config.trial_max_duration })}>
                        Update
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Daily Generation Limit</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input
                        type="number"
                        value={config.daily_generation_limit}
                        onChange={(e) => setConfig({ ...config, daily_generation_limit: parseInt(e.target.value) })}
                      />
                      <button className="btn btn-primary" onClick={() => handleUpdateConfig({ daily_generation_limit: config.daily_generation_limit })}>
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="glass-card">
              <h2 className="admin-section-header">Topic Library</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  The topics below are <strong>FIXED</strong> per product requirements. You can manage the AI Prompt Template for each subject in the <strong>Overview</strong> tab.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {(config?.topics || []).map((t, idx) => (
                    <div
                      key={idx}
                      className="glass-card"
                      style={{
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      <CheckCircle2 size={18} color="var(--success)" />
                      <span style={{ fontWeight: '600' }}>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-card animate-fade-in">
            <h2 className="admin-section-header">User Base Directory</h2>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <React.Fragment key={u.id || i}>
                      <tr className="history-item" style={{ animationDelay: `${i * 0.05}s` }}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{u.full_name || u.email.split('@')[0]}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${u.plan}`}>
                            {u.plan.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: u.status === 'active' ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                            {u.status === 'active' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {u.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => toggleUserManagement(u)}
                          >
                            {editingUser?.id === u.id ? 'Close' : 'Manage'}
                          </button>
                        </td>
                      </tr>
                      {editingUser?.id === u.id && (
                        <tr>
                          <td colSpan="4" style={{ padding: '0', border: 'none' }}>
                            <div className="animate-fade-in" style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--glass-border)' }}>
                              <div className="grid grid-2" style={{ gap: '3rem', marginBottom: '2rem' }}>
                                <div className="input-group">
                                  <label>Subscription Plan</label>
                                  <select
                                    value={editingUser.plan}
                                    onChange={(e) => handleUpdateUser(editingUser.id, { plan: e.target.value, is_paid: e.target.value === 'paid' })}
                                  >
                                    <option value="trial">Trial Access</option>
                                    <option value="paid">Premium Plan</option>
                                  </select>
                                </div>
                                <div className="input-group">
                                  <label>Account Status</label>
                                  <select
                                    value={editingUser.status}
                                    onChange={(e) => handleUpdateUser(editingUser.id, { status: e.target.value, is_active: e.target.value === 'active' })}
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </div>
                              </div>

                              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                  <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <History size={18} color="var(--primary)" /> User Study History
                                  </h3>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filter by Date:</span>
                                    <input
                                      type="date"
                                      value={dateFilter}
                                      onChange={(e) => setDateFilter(e.target.value)}
                                      style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', fontSize: '0.85rem' }}
                                    />
                                    {dateFilter && (
                                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setDateFilter('')}>Clear</button>
                                    )}
                                  </div>
                                </div>

                                {fetchingHistory ? (
                                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                                    <Activity className="animate-pulse" size={24} color="var(--primary)" />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Fetching session data...</p>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                      <Clock size={20} color="#3b82f6" />
                                      <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Application Usage</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{userHistory.length} Sessions Total</div>
                                      </div>
                                    </div>

                                    {userHistory.length === 0 ? (
                                      <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '1rem', border: '1px dashed var(--glass-border)' }}>
                                        <p style={{ color: 'var(--text-muted)' }}>No study sessions found for this user.</p>
                                      </div>
                                    ) : (
                                      <div className="admin-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table className="admin-table">
                                          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-dark)', zIndex: 10 }}>
                                            <tr>
                                              <th>Date</th>
                                              <th>Topic / Subject</th>
                                              <th>Duration</th>
                                              <th>Features</th>
                                              <th>Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {userHistory
                                              .filter(s => !dateFilter || new Date(s.created_at).toISOString().split('T')[0] === dateFilter)
                                              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                              .map((session, idx) => (
                                                <React.Fragment key={session.id || idx}>
                                                  <tr className="history-item">
                                                    <td style={{ fontSize: '0.85rem' }}>
                                                      {new Date(session.created_at).toLocaleDateString()}
                                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td>
                                                      <div style={{ fontWeight: '500', color: 'var(--primary)' }}>{session.topic}</div>
                                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.prompt}>
                                                        {session.prompt}
                                                      </div>
                                                    </td>
                                                    <td>{session.duration_minutes}m</td>
                                                    <td>
                                                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                        {session.exam_mode && <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>Exam</span>}
                                                        {session.text_highlighting && <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>Sync</span>}
                                                      </div>
                                                    </td>
                                                    <td>
                                                      <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                                                        onClick={() => {
                                                          const row = document.getElementById(`content-${session.id}`);
                                                          if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
                                                        }}
                                                      >
                                                        View Content
                                                      </button>
                                                    </td>
                                                  </tr>
                                                  <tr id={`content-${session.id}`} style={{ display: 'none' }}>
                                                    <td colSpan="5" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                                                      <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', border: '1px solid var(--glass-border)' }}>
                                                        <strong>Topic Answer Content:</strong><br /><br />
                                                        {session.content || "No content saved for this session."}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                </React.Fragment>
                                              ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
