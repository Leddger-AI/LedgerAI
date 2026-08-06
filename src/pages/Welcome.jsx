import React from 'react';
import { Brain, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Welcome({ onStartDashboard }) {
  const handleEnter = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    if (onStartDashboard) {
      onStartDashboard();
    }
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="welcome-left">
          <h1 className="welcome-title fade-in-up">
            Welcome to <span className="highlight-text">Ledger AI</span>
          </h1>
          <p className="welcome-desc fade-in-up delay-1">
            Your command center for transparent hiring. Uncover insights, track metrics, and manage your pipeline with unprecedented clarity.
          </p>
          <div className="fade-in-up delay-2">
            <button className="welcome-cta" onClick={handleEnter}>
              Enter Dashboard <ArrowRight size={20} className="cta-icon" />
            </button>
          </div>
        </div>

        <div className="welcome-right">
          <div className="feature-stack">
            <div className="feature-card feature-1 fade-in-right delay-2">
              <div className="feature-icon-wrapper">
                <Brain size={24} className="feature-icon" />
              </div>
              <div className="feature-text">
                <h3>AI-Powered Attribution</h3>
                <p>Automatically tags meetings to the right projects with high confidence.</p>
              </div>
            </div>
            
            <div className="feature-card feature-2 fade-in-right delay-3">
              <div className="feature-icon-wrapper">
                <TrendingUp size={24} className="feature-icon" />
              </div>
              <div className="feature-text">
                <h3>Real-Time Cost Tracking</h3>
                <p>Watch burn rates dynamically update as meetings happen.</p>
              </div>
            </div>
            
            <div className="feature-card feature-3 fade-in-right delay-4">
              <div className="feature-icon-wrapper">
                <CheckCircle2 size={24} className="feature-icon" />
              </div>
              <div className="feature-text">
                <h3>Secure & Transparent</h3>
                <p>Full visibility into resource allocation without compromising privacy.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
          
          .welcome-container {
            background-color: #1A1D1D;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Poppins', sans-serif;
            color: #FFFFFF;
            overflow: hidden;
            position: relative;
          }

          /* Background aesthetic elements */
          .welcome-container::before {
            content: '';
            position: absolute;
            top: -20%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(215,254,250,0.06) 0%, rgba(26,29,29,0) 70%);
            border-radius: 50%;
            pointer-events: none;
            animation: pulse-glow 8s infinite alternate ease-in-out;
          }

          .welcome-container::after {
            content: '';
            position: absolute;
            bottom: -20%;
            left: -10%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(215,254,250,0.04) 0%, rgba(26,29,29,0) 70%);
            border-radius: 50%;
            pointer-events: none;
            animation: pulse-glow 10s infinite alternate-reverse ease-in-out;
          }

          @keyframes pulse-glow {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.1); opacity: 1; }
          }

          .welcome-content {
            max-width: 1250px;
            width: 100%;
            padding: 4rem 2rem;
            display: flex;
            align-items: center;
            gap: 6rem;
            z-index: 1;
          }

          .welcome-left {
            flex: 1.1;
            max-width: 600px;
          }

          .welcome-title {
            font-size: 64px;
            font-weight: 700;
            line-height: 1.1;
            margin-bottom: 1.5rem;
            letter-spacing: -1.5px;
          }

          .highlight-text {
            color: #D7FEFA;
            text-shadow: 0 0 25px rgba(215,254,250,0.3);
          }

          .welcome-desc {
            font-size: 20px;
            color: rgba(255, 255, 255, 0.75);
            line-height: 1.6;
            margin-bottom: 3.5rem;
          }

          .welcome-cta {
            background-color: #D7FEFA;
            color: #1A1D1D;
            font-family: 'Poppins', sans-serif;
            font-size: 18px;
            font-weight: 600;
            padding: 1.2rem 2.5rem;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: inline-flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 25px rgba(215, 254, 250, 0.2);
          }

          .welcome-cta:hover {
            transform: translateY(-4px);
            box-shadow: 0 15px 35px rgba(215, 254, 250, 0.4);
            background-color: #ffffff;
          }

          .cta-icon {
            transition: transform 0.3s ease;
          }

          .welcome-cta:hover .cta-icon {
            transform: translateX(6px);
          }

          .welcome-right {
            flex: 1;
            display: flex;
            justify-content: flex-end;
          }

          .feature-stack {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            width: 100%;
            max-width: 500px;
          }

          .feature-card {
            background-color: rgba(43, 46, 46, 0.4);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 20px;
            padding: 1.8rem;
            display: flex;
            align-items: flex-start;
            gap: 1.5rem;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            position: relative;
            overflow: hidden;
          }

          .feature-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(135deg, rgba(215,254,250,0.1) 0%, rgba(215,254,250,0) 100%);
            opacity: 0;
            transition: opacity 0.4s ease;
            z-index: 0;
          }

          .feature-card:hover {
            transform: translateX(-15px) translateY(-5px) scale(1.02);
            border-color: rgba(215, 254, 250, 0.3);
            background-color: rgba(43, 46, 46, 0.8);
            box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(215, 254, 250, 0.05);
          }

          .feature-card:hover::before {
            opacity: 1;
          }

          .feature-icon-wrapper, .feature-text {
            position: relative;
            z-index: 1;
          }

          .feature-text h3 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #ffffff;
            letter-spacing: -0.5px;
          }

          .feature-text p {
            font-size: 15px;
            color: rgba(255, 255, 255, 0.65);
            line-height: 1.5;
            margin: 0;
          }

          .feature-icon-wrapper {
            background: rgba(215, 254, 250, 0.08);
            padding: 14px;
            border-radius: 14px;
            flex-shrink: 0;
            border: 1px solid rgba(215, 254, 250, 0.1);
            transition: all 0.3s ease;
          }

          .feature-icon {
            color: #D7FEFA;
            display: block;
          }

          .feature-card:hover .feature-icon-wrapper {
            background: #D7FEFA;
            box-shadow: 0 0 20px rgba(215, 254, 250, 0.4);
          }

          .feature-card:hover .feature-icon {
            color: #1A1D1D;
          }

          /* Animations */
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(40px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeInRight {
            from {
              opacity: 0;
              transform: translateX(50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .fade-in-up {
            opacity: 0;
            animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .fade-in-right {
            opacity: 0;
            animation: fadeInRight 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .delay-1 { animation-delay: 0.15s; }
          .delay-2 { animation-delay: 0.3s; }
          .delay-3 { animation-delay: 0.45s; }
          .delay-4 { animation-delay: 0.6s; }

          /* Responsive */
          @media (max-width: 1024px) {
            .welcome-content {
              gap: 3rem;
            }
            .welcome-title {
              font-size: 52px;
            }
          }

          @media (max-width: 868px) {
            .welcome-container {
              align-items: flex-start;
              overflow-y: auto;
            }
            
            .welcome-content {
              flex-direction: column;
              text-align: center;
              padding: 4rem 2rem 6rem;
            }
            
            .welcome-left {
              margin-bottom: 2rem;
            }

            .welcome-right {
              justify-content: center;
              width: 100%;
            }

            .feature-card {
              text-align: left;
            }
            
            .feature-card:hover {
              transform: translateY(-5px);
            }
          }
        `}
      </style>
    </div>
  );
}
