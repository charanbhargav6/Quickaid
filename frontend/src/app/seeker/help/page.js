'use client';
import React from 'react';

export default function HelpPage() {
  const faqs = [
    {
      question: "How do I post a new task?",
      answer: "You can post a new task by going to your Dashboard and clicking the '+ Post New Task' button in the top right corner. Fill out the title, description, and price, then submit."
    },
    {
      question: "How do I pay a helper?",
      answer: "Once a task is completed, you can process the payment through our secure platform using your connected wallet or credit card."
    },
    {
      question: "What if I have an issue with a helper?",
      answer: "If you experience any issues, please contact our support team immediately or use the report feature on the task page to alert our administrators."
    }
  ];

  return (
    <>
      <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '24px' }}>Help & Support</h1>
      </header>
      <div style={{ padding: '2rem', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section>
          <h2 style={{ fontSize: '20px', marginBottom: '1rem' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, index) => (
              <div key={index} className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 0.5rem 0' }}>{faq.question}</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
        
        <section>
          <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'var(--primary-light)', border: 'none' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Still need help?</h3>
            <p style={{ margin: '0 0 1.5rem 0' }}>Our support team is available 24/7 to assist you with any questions or concerns.</p>
            <button className="btn btn-primary">Contact Support</button>
          </div>
        </section>
      </div>
    </>
  );
}
