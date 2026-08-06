import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      lineHeight: 1.6,
      color: '#333',
      backgroundColor: '#f9f9f9',
      margin: 0,
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ color: '#111', borderBottom: '2px solid #D7FEFA', paddingBottom: '10px', marginBottom: '30px' }}>Privacy Policy</h1>
        <p><strong>Last Updated:</strong> August 2026</p>
        
        <p>Welcome to Leddger AI ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <a href="https://leddger-ai.netlify.app/" style={{ color: '#0066cc', textDecoration: 'none' }}>https://leddger-ai.netlify.app/</a> and use our services.</p>
        
        <h2 style={{ marginTop: '30px', color: '#222' }}>1. Description of Service</h2>
        <p>Leddger AI is an AI-powered secure recruitment and project attribution tool. We help organizations track metrics, uncover insights, and manage hiring pipelines transparently by analyzing meeting data and attributing it to the appropriate projects.</p>

        <h2 style={{ marginTop: '30px', color: '#222' }}>2. Information We Collect</h2>
        <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
        <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and profile picture, that you voluntarily give to us when you register with the application via OAuth providers.</li>
            <li><strong>Application Data:</strong> Data related to your use of the application, including meeting metadata, calendar events, and project details submitted through our platform.</li>
        </ul>

        <h2 style={{ marginTop: '30px', color: '#222' }}>3. Google Data and API Services User Data Policy</h2>
        <p>Leddger AI utilizes Google OAuth for authentication and requests access to specific user data (such as Google Calendar events) to provide its core functionality. Our use of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        
        <h3 style={{ color: '#111' }}>How Google Data is Accessed and Used</h3>
        <p>We access your Google Calendar data strictly to analyze meeting metadata (e.g., duration, attendee count, titles) in order to attribute these meetings to specific projects and calculate associated burn rates and metrics. We do not read the content of your emails or access data outside the scope of what is required to perform this project attribution.</p>
        
        <h3 style={{ color: '#111' }}>How Google Data is Stored</h3>
        <p>Data retrieved from Google APIs is processed securely. Temporary metadata required for AI attribution may be stored in our secure database. We employ military-grade AES encryption to ensure that sensitive data remains strictly confidential and protected against unauthorized access.</p>

        <h3 style={{ color: '#111' }}>How Google Data is Shared</h3>
        <p><strong>We do not sell, trade, or otherwise transfer your Google user data to outside parties.</strong> Your data is not used for advertising purposes. We only share data with trusted third-party service providers (such as secure cloud hosting platforms) who assist us in operating our application, conducting our business, or servicing you, so long as those parties agree to keep this information confidential and comply with strict data protection standards.</p>

        <h2 style={{ marginTop: '30px', color: '#222' }}>4. Use of Your Information</h2>
        <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
        <ul>
            <li>Create and manage your account.</li>
            <li>Provide the core project attribution and metric tracking services.</li>
            <li>Improve our application and user experience.</li>
            <li>Communicate with you regarding updates or support.</li>
        </ul>

        <h2 style={{ marginTop: '30px', color: '#222' }}>5. Data Security</h2>
        <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>

        <h2 style={{ marginTop: '30px', color: '#222' }}>6. Contact Us</h2>
        <p>If you have questions or comments about this Privacy Policy, please contact us at:</p>
        <p><strong>Email:</strong> <a href="mailto:chitkullakshya@gmail.com" style={{ color: '#0066cc', textDecoration: 'none' }}>chitkullakshya@gmail.com</a></p>

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '0.9em', color: '#666' }}>
            &copy; 2026 Leddger AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}
