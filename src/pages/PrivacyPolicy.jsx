import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{
      fontFamily: "var(--font-body, 'Inter', sans-serif)",
      lineHeight: 1.6,
      color: 'rgba(255, 255, 255, 0.8)',
      backgroundColor: '#1A1D1D', /* Dark background */
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
        backgroundColor: '#2B2E2E', /* Dark card background */
        padding: '50px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <h1 style={{ color: '#ffffff', borderBottom: '2px solid #D7FEFA', paddingBottom: '16px', marginBottom: '30px', fontSize: '2.5rem', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 600, letterSpacing: '-0.02em' }}>Privacy Policy</h1>
        <p style={{ color: '#D7FEFA', fontWeight: 500 }}>Last Updated: August 2026</p>
        
        <p>Welcome to Leddger AI ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <a href="https://leddger-ai.netlify.app/" style={{ color: '#D7FEFA', textDecoration: 'none', fontWeight: 500 }}>https://leddger-ai.netlify.app/</a> and use our services.</p>
        
        <h2 style={{ marginTop: '40px', color: '#ffffff', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 500 }}>1. Description of Service</h2>
        <p>Leddger AI is an AI-powered secure recruitment and project attribution tool. We help organizations track metrics, uncover insights, and manage hiring pipelines transparently by analyzing meeting data and attributing it to the appropriate projects.</p>

        <h2 style={{ marginTop: '40px', color: '#ffffff', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 500 }}>2. Information We Collect</h2>
        <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
        <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '10px' }}><strong style={{ color: '#ffffff' }}>Personal Data:</strong> Personally identifiable information, such as your name, email address, and profile picture, that you voluntarily give to us when you register with the application via OAuth providers.</li>
            <li style={{ marginBottom: '10px' }}><strong style={{ color: '#ffffff' }}>Application Data:</strong> Data related to your use of the application, including meeting metadata, calendar events, and project details submitted through our platform.</li>
        </ul>

        <h2 style={{ marginTop: '40px', color: '#ffffff', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 500 }}>3. Google Data and API Services User Data Policy</h2>
        <p>Leddger AI utilizes Google OAuth for authentication and requests access to specific user data (such as Google Calendar events) to provide its core functionality. Our use of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" style={{ color: '#D7FEFA', textDecoration: 'none', fontWeight: 500 }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        
        <h3 style={{ marginTop: '20px', color: '#ffffff', fontWeight: 500 }}>How Google Data is Accessed and Used</h3>
        <p>We access your Google Calendar data strictly to analyze meeting metadata (e.g., duration, attendee count, titles) in order to attribute these meetings to specific projects and calculate associated burn rates and metrics. We do not read the content of your emails or access data outside the scope of what is required to perform this project attribution.</p>
        
        <h3 style={{ marginTop: '20px', color: '#ffffff', fontWeight: 500 }}>How Google Data is Stored</h3>
        <p>Data retrieved from Google APIs is processed securely. Temporary metadata required for AI attribution may be stored in our secure database. We employ military-grade AES encryption to ensure that sensitive data remains strictly confidential and protected against unauthorized access.</p>

        <h3 style={{ marginTop: '20px', color: '#ffffff', fontWeight: 500 }}>How Google Data is Shared</h3>
        <p><strong style={{ color: '#ffffff' }}>We do not sell, trade, or otherwise transfer your Google user data to outside parties.</strong> Your data is not used for advertising purposes. We only share data with trusted third-party service providers (such as secure cloud hosting platforms) who assist us in operating our application, conducting our business, or servicing you, so long as those parties agree to keep this information confidential and comply with strict data protection standards.</p>

        <h2 style={{ marginTop: '40px', color: '#ffffff', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 500 }}>4. Use of Your Information</h2>
        <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
        <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Create and manage your account.</li>
            <li style={{ marginBottom: '8px' }}>Provide the core project attribution and metric tracking services.</li>
            <li style={{ marginBottom: '8px' }}>Improve our application and user experience.</li>
            <li style={{ marginBottom: '8px' }}>Communicate with you regarding updates or support.</li>
        </ul>

        <h2 style={{ marginTop: '40px', color: '#ffffff', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 500 }}>5. Data Security</h2>
        <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>

        <h2 style={{ marginTop: '40px', color: '#ffffff', fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 500 }}>6. Contact Us</h2>
        <p>If you have questions or comments about this Privacy Policy, please contact us at:</p>
        <p><strong style={{ color: '#ffffff' }}>Email:</strong> <a href="mailto:chitkullakshya@gmail.com" style={{ color: '#D7FEFA', textDecoration: 'none', fontWeight: 500 }}>chitkullakshya@gmail.com</a></p>

        <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9em', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            &copy; 2026 Leddger AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}
