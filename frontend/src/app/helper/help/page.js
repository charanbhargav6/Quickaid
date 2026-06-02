'use client';

export default function HelperHelpPage() {
  const faqs = [
    {
      question: "How do I accept a task?",
      answer: "Go to your Dashboard, find an open task that fits your schedule, and click the 'Accept Task' button. Once accepted, it will move to your My Tasks list."
    },
    {
      question: "When do I get paid?",
      answer: "Payments are processed automatically once you mark a task as completed and it is verified. You can track your total earnings in the Earnings tab."
    },
    {
      question: "How does the 'Online' status work?",
      answer: "Toggling your status to 'Online' lets users know you are currently available to take on new tasks immediately. If you're busy or done for the day, toggle it to 'Offline'."
    },
    {
      question: "What if I need to cancel a task I accepted?",
      answer: "Please contact support directly if you need to cancel a task. Repeated cancellations may affect your helper rating."
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Help & Support</h1>
      
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Frequently Asked Questions</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {faqs.map((faq, index) => (
          <div key={index} className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', color: 'var(--primary)' }}>{faq.question}</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>{faq.answer}</p>
          </div>
        ))}
      </div>
      
      <div className="card" style={{ padding: '2rem', marginTop: '3rem', textAlign: 'center', backgroundColor: 'var(--blue-50)', border: '1px solid var(--blue-100)' }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', color: 'var(--primary)' }}>Still need help?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Our support team is available 24/7 to assist you with any issues.</p>
        <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Contact Support</button>
      </div>
    </div>
  );
}
