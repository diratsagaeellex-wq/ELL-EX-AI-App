
import React from "react";

export default function WelcomeScreen({ onEnter }) {
  return (
    <div className="ell-welcome">
      <style>{`
        .ell-welcome {
          position: fixed;
          inset: 0;
          z-index: 9999;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          overflow: auto;
          text-align: center;
          color: white;
          background: radial-gradient(
            circle at 50% 35%,
            #123d77 0%,
            #071326 48%,
            #02040a 100%
          );
        }
        .ell-welcome-logo {
          width: 130px;
          max-width: 45vw;
          height: auto;
          object-fit: contain;
          animation: ellAppear 1.4s ease-out both;
          filter: drop-shadow(0 0 24px #328cff77);
        }
        .ell-welcome h1 {
          margin: 24px 0 8px;
          font-size: clamp(30px, 9vw, 52px);
          color: #e8bd67;
          letter-spacing: 3px;
          animation: ellAppear 1.6s ease-out both;
        }
        .ell-welcome p {
          font-size: 16px;
          color: #c9d8f0;
          animation: ellAppear 1.9s ease-out both;
        }
        .ell-enter {
          margin-top: 36px;
          padding: 16px 42px;
          border: 1px solid #e8bd67;
          border-radius: 40px;
          background: linear-gradient(135deg,#c99b42,#f7dc91);
          color: #101827;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          animation: ellAppear 2.2s ease-out both;
        }
        .ell-enter:focus-visible {
          outline: 3px solid white;
          outline-offset: 4px;
        }
        @keyframes ellAppear {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ell-welcome * { animation: none !important; }
        }
      `}</style>

      <img
        className="ell-welcome-logo"
        src="/ell-ex-logo.png"
        alt="ELL-EX logo"
      />

      <h1>ELL-EX</h1>
      <p>Imagine it. Build it. Live it.</p>

      <button
        className="ell-enter"
        type="button"
        onClick={onEnter}
      >
        Get Started
      </button>
    </div>
  );
}
