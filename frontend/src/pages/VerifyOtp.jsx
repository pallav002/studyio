import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { ShieldCheck, ArrowRight, RefreshCw, Mail } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const VerifyOtp = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/verify-otp', { email, otp });
            setMessage('Verification successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        try {
            await api.post(`/auth/resend-otp?email=${email}`);
            setMessage('New verification code sent to your email.');
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            setError('Failed to resend OTP. Please try again.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                    <ThemeToggle />
                </div>

                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 1.5rem',
                    border: '1px solid var(--primary)'
                }}>
                    <Mail size={32} color="var(--primary)" />
                </div>

                <h2 style={{ marginBottom: '0.5rem' }}>Verify Your Email</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                    We've sent a 6-digit code to <br />
                    <strong style={{ color: 'var(--text)' }}>{email}</strong>
                </p>

                {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>{error}</div>}
                {message && <div style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem' }}>{message}</div>}

                <form onSubmit={handleVerify}>
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="0 0 0 0 0 0"
                            maxLength="6"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            style={{
                                textAlign: 'center',
                                fontSize: '1.5rem',
                                letterSpacing: '0.5rem',
                                fontWeight: 'bold',
                                padding: '1rem'
                            }}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Verifying...' : <><ShieldCheck size={18} /> Verify Code</>}
                    </button>
                </form>

                <button
                    onClick={handleResend}
                    disabled={resending}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.875rem',
                        marginTop: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%'
                    }}
                >
                    {resending ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Resend Verification Code
                </button>

                <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Wrong email? <span onClick={() => navigate('/login')} style={{ color: 'var(--primary)', cursor: 'pointer' }}>Go back</span>
                </p>
            </div>
        </div>
    );
};

export default VerifyOtp;
