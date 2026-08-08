import React from 'react';

export default function TermsOfService() {
  return (
    <div style={{
      fontFamily: "var(--cz-font, 'Inter', sans-serif)",
      lineHeight: 1.6,
      color: 'rgba(20, 20, 20, 0.85)',
      backgroundColor: '#F2E8D5', /* Cream main background */
      margin: 0,
      padding: '80px 20px',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        backgroundColor: '#FFFFFF', /* White card */
        padding: '50px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(20, 20, 20, 0.1)',
        border: '1px solid rgba(20, 20, 20, 0.08)'
      }}>
        <h1 style={{ color: '#141414', borderBottom: '2px solid #141414', paddingBottom: '16px', marginBottom: '30px', fontSize: '2.5rem', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 700, letterSpacing: '-0.02em' }}>Terms of Service</h1>
        <p style={{ color: 'rgba(20, 20, 20, 0.65)', fontWeight: 600 }}>Last Updated: August 2026</p>
        
        <p>Welcome to Leddger AI! These Terms of Service ("Terms") govern your use of the Leddger AI website located at <a href="https://leddger-ai.netlify.app/" style={{ color: '#141414', textDecoration: 'none', fontWeight: 600 }}>https://leddger-ai.netlify.app/</a> and the services provided through it.</p>
        
        <p>By accessing or using our service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.</p>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>1. Description of Service</h2>
        <p>Leddger AI is an AI-powered secure recruitment and project attribution tool. It allows users to track organizational metrics, attribute meetings to projects, and securely manage hiring pipelines using data integration and local encryption.</p>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>2. Accounts and Authentication</h2>
        <p>When you create an account with us, you must provide accurate, complete, and current information. We use third-party OAuth providers (such as Google) for authentication. By using Google to log in, you agree to allow us to access certain information from your Google account as detailed in our Privacy Policy.</p>
        <p>You are responsible for safeguarding the password or credentials that you use to access the service and for any activities or actions under your account.</p>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>3. Acceptable Use</h2>
        <p>You agree not to use the service:</p>
        <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>In any way that violates any applicable national or international law or regulation.</li>
            <li style={{ marginBottom: '8px' }}>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
            <li style={{ marginBottom: '8px' }}>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
            <li style={{ marginBottom: '8px' }}>To impersonate or attempt to impersonate Leddger AI, a company employee, another user, or any other person or entity.</li>
        </ul>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>4. Intellectual Property</h2>
        <p>The service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Leddger AI and its licensors. The service is protected by copyright, trademark, and other laws of both your country and foreign countries.</p>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>5. Limitation of Liability</h2>
        <p>In no event shall Leddger AI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content.</p>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>6. Termination</h2>
        <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.</p>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>7. Changes to Terms</h2>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>

        <h2 style={{ marginTop: '40px', color: '#141414', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600 }}>8. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us at:</p>
        <p><strong style={{ color: '#141414' }}>Email:</strong> <a href="mailto:chitkullakshya@gmail.com" style={{ color: '#141414', textDecoration: 'none', fontWeight: 600 }}>chitkullakshya@gmail.com</a></p>

        <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid rgba(20,20,20,0.1)', fontSize: '0.9em', color: 'rgba(20,20,20,0.65)', textAlign: 'center' }}>
            &copy; 2026 Leddger AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}

