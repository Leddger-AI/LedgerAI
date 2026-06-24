import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NAV_LINKS = [
  { label: 'Overview', path: '/' },
  { label: 'Recruiter Flow', path: '/recruiter-flow' },
  { label: 'Candidate Flow', path: '/candidate-flow' },
  { label: 'Security', path: '/security' }
];

const hiddenRoutes = ['/how-it-works', '/analytics'];

export default function Navbar({ onStartDashboard, loading }) {
  const location = useLocation();
  const [isFloating, setIsFloating] = useState(false);
  const [positionStyle, setPositionStyle] = useState({
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)'
  });

  useEffect(() => {
    const handleScroll = () => {
      const isLandingPage = location.pathname === '/' || location.pathname === '/security';
      if (!isLandingPage) {
        setPositionStyle({
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)'
        });
        setIsFloating(true);
        return;
      }

      const placeholder = document.getElementById('navbar-placeholder');
      if (placeholder) {
        const rect = placeholder.getBoundingClientRect();
        if (rect.top > 20) {
          setPositionStyle({
            position: 'absolute',
            top: `${window.scrollY + rect.top}px`,
            left: '50%',
            transform: 'translateX(-50%)'
          });
          setIsFloating(false);
        } else {
          setPositionStyle({
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)'
          });
          setIsFloating(true);
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    // Minor polling to handle document layout shifts during startup loads
    const interval = setInterval(handleScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearInterval(interval);
    };
  }, [location.pathname]);

  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <div className="cz-pebble-nav-container" style={positionStyle}>
      <nav className={`cz-pebble-nav ${isFloating ? 'floating' : 'inline'}`}>
        {NAV_LINKS.map(item => {
          const isActive = location.pathname === item.path || (item.path === '/recruiter-flow' && location.pathname === '/recruiter');
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className="cz-pebble-item"
            >
              {isActive && (
                <motion.div 
                  layoutId="pebble" 
                  className="cz-pebble-bg" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`cz-pebble-text ${isActive ? 'active' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
