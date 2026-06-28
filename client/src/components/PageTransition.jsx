import React from 'react';

export default function PageTransition({ children }) {
  return (
    <div className="w-full min-h-[calc(100vh-100px)] pt-[100px] pb-12 px-6 flex flex-col items-center animate-[slideInPage_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {children}

      <style>{`
        @keyframes slideInPage {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
