import React from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, Zap, X } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, onUpgrade, loading }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(8px)',
            padding: '1.5rem'
        }}>
            <div className="glass-card animate-fade-in" style={{
                maxWidth: '500px',
                width: '100%',
                padding: '2.5rem',
                textAlign: 'center',
                border: '2px solid var(--primary)',
                boxShadow: '0 0 50px rgba(99, 102, 241, 0.3)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    disabled={loading}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        borderRadius: '50%'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <X size={20} />
                </button>
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 2rem',
                    border: '1px solid var(--primary)'
                }}>
                    <Sparkles size={40} color="var(--primary)" className="animate-pulse" />
                </div>

                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Upgrade to Premium</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
                    Your free trial has ended. Upgrade to Premium to continue your learning journey with unlimited sessions and advanced features.
                </p>

                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    marginBottom: '2.5rem',
                    textAlign: 'left'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <CheckCircle2 size={18} color="var(--success)" />
                        <span style={{ fontSize: '0.95rem' }}>Unlimited Study Generations</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <CheckCircle2 size={18} color="var(--success)" />
                        <span style={{ fontSize: '0.95rem' }}>Advanced Exam Mode</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <CheckCircle2 size={18} color="var(--success)" />
                        <span style={{ fontSize: '0.95rem' }}>Dynamic Text Highlighting</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CheckCircle2 size={18} color="var(--success)" />
                        <span style={{ fontSize: '0.95rem' }}>10-Minute Maximum Duration</span>
                    </div>
                </div>

                <button
                    onClick={onUpgrade}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        padding: '1.1rem',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)'
                    }}
                >
                    {loading ? 'Upgrading...' : <><Zap size={18} fill="currentColor" /> Upgrade Plan (FREE)</>}
                </button>

                <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    No payment required. Instant access.
                </p>
            </div>
        </div>
    );
};

export default UpgradeModal;
