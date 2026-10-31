import Icon from './Icon.jsx';

// Vertical "What happens next?" card used on the New Request screen.
export function WhatHappensNext() {
  const steps = [
    { title: 'We analyze your request', text: 'Our system will automatically classify the category, priority, and any safety risks.' },
    { title: 'We route it to the right team', text: 'Your request is sent to the appropriate manager for review.' },
    { title: 'You’ll be notified', text: 'You can track the status in My Requests.' },
  ];
  return (
    <section className="next-card">
      <div className="next-head">
        <div className="next-icon"><Icon name="clipboard" size={32} /></div>
        <h2 className="next-title">What happens next?</h2>
      </div>
      <div className="next-body steps">
        {steps.map((s, i) => (
          <div key={s.title} className="step">
            <div className="step-rail"><div className="step-num">{i + 1}</div>{i < steps.length - 1 && <div className="step-line" />}</div>
            <div className="step-body"><div className="step-title">{s.title}</div><div className="step-text">{s.text}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RequestTips() {
  return (
    <section className="tips-card">
      <div className="tips-head"><Icon name="bulb" size={40} /><h2 className="tips-title">Tips for a good request</h2></div>
      <div className="tips-list">
        {['Be specific about the problem', 'Include the exact location', 'Add photos if possible'].map((t) => (
          <div key={t} className="tips-item"><Icon name="checkCircle" size={22} /><span>{t}</span></div>
        ))}
      </div>
    </section>
  );
}

// Status → how far along the request is (for trackers).
export const REQUEST_STAGE = {
  'Submitted': 1, 'Pending Review': 3, 'Under Review': 3, 'Approved': 4, 'In Progress': 4, 'Completed': 5, 'Rejected': 3,
};
