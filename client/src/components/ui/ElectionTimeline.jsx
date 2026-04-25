import React from 'react';

/**
 * Election Timeline Component
 * Visualizes the lifecycle stages of an election.
 * 
 * @param {Date|string} startDate
 * @param {Date|string} endDate 
 */
export default function ElectionTimeline({ startDate, endDate }) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Determine current stage: 1 = Created/Upcoming, 2 = Active Voting, 3 = Ended/Tallying
  let currentStage = 1;
  if (now >= start && now <= end) currentStage = 2;
  if (now > end) currentStage = 3;

  return (
    <div className="timeline-container animate-fade-in">
      <div className="timeline-track">
        {/* Stage 1: Created */}
        <div className={`timeline-stage ${currentStage >= 1 ? 'completed' : ''}`}>
          <div className="timeline-dot">{currentStage > 1 ? '✓' : '1'}</div>
          <div className="timeline-label">Created</div>
          <div className="timeline-date">{start.toLocaleDateString()}</div>
        </div>

        {/* Stage 2: Voting Active */}
        <div className={`timeline-stage ${currentStage >= 2 ? 'completed' : ''} ${currentStage === 2 ? 'active' : ''}`}>
          <div className="timeline-dot">{currentStage > 2 ? '✓' : '2'}</div>
          <div className="timeline-label">Voting Open</div>
          {currentStage === 2 && <div className="timeline-date pulse-text">Live Now</div>}
        </div>

        {/* Stage 3: Ended */}
        <div className={`timeline-stage ${currentStage === 3 ? 'completed active' : ''}`}>
          <div className="timeline-dot">3</div>
          <div className="timeline-label">Ended & Tallied</div>
          <div className="timeline-date">{end.toLocaleDateString()}</div>
        </div>
        
        {/* Progress Line */}
        <div 
          className="timeline-progress-line" 
          style={{ width: currentStage === 1 ? '0%' : currentStage === 2 ? '50%' : '100%' }}
        />
      </div>
    </div>
  );
}
