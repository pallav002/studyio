import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const AudioPlayer = ({ src, title, userPlan, listenCount, content, speechMarks = [], onPlayerError }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const audioRef = useRef(null);

    const isTrial = userPlan === 'trial';
    const canHighlight = userPlan === 'paid' && speechMarks.length > 0;



    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        const time = audioRef.current.currentTime * 1000; // Polly marks are in ms
        setCurrentTime(audioRef.current.currentTime);

        if (canHighlight) {
            // Find the current word based on time
            const markIndex = speechMarks.findIndex((mark, index) => {
                const nextMark = speechMarks[index + 1];
                return time >= mark.time && (!nextMark || time < nextMark.time);
            });
            setCurrentWordIndex(markIndex);
        }
    };



    const renderHighlightedContent = () => {
        if (!content) return null;
        if (!canHighlight) return <p style={{ lineHeight: '1.6' }}>{content}</p>;

        return (
            <p style={{ lineHeight: '1.8', fontSize: '1.05rem' }}>
                {speechMarks.map((mark, index) => (
                    <span
                        key={index}
                        style={{
                            backgroundColor: currentWordIndex === index ? 'rgba(var(--primary-rgb), 0.3)' : 'transparent',
                            borderRadius: '2px',
                            padding: '0 2px',
                            transition: 'background-color 0.1s ease',
                            color: currentWordIndex === index ? 'var(--primary)' : 'inherit',
                            fontWeight: currentWordIndex === index ? 'bold' : 'normal'
                        }}
                    >
                        {mark.value}{' '}
                    </span>
                ))}
            </p>
        );
    };

    return (
        <div className={`glass-card audio-player ${isPlaying ? 'audio-player-active' : ''}`} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Study Session Audio</p>
                </div>
                {/* Listens used counter removed for cleaner UI */}
            </div>

            <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                {renderHighlightedContent()}
            </div>

            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                    // If audio fails with 403, it might be the trial limit
                    // We can't easily check HTTP status here, but we can pass it up
                    if (onPlayerError) onPlayerError();
                }}
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
            />

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <button onClick={togglePlay} className="btn btn-primary" style={{ borderRadius: '50%', width: '3.5rem', height: '3.5rem', padding: 0, justifyContent: 'center' }}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
            </div>
        </div>
    );
};

export default AudioPlayer;
