'use client'

// Play Nexa — PageLoader
// Premium N-logo loading animation
// Only opacity + transform used (GPU safe, 2GB RAM devices)
// No text, no spinner ring, just the animated N logo

export default function PageLoader() {
  return (
    <>
      <style>{`
        @keyframes pn-logo-appear {
          0%   { opacity: 0; transform: scale(0.75); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes pn-wave-pulse {
          0%,100% { opacity: 0.25; transform: scaleY(1); }
          50%      { opacity: 1;    transform: scaleY(1.35); }
        }

        @keyframes pn-play-glow {
          0%,100% { opacity: 0.2; }
          50%      { opacity: 1; }
        }

        @keyframes pn-game-glow {
          0%,100% { opacity: 0.2; }
          50%      { opacity: 1; }
        }

        @keyframes pn-dl-glow {
          0%,100% { opacity: 0.2; }
          50%      { opacity: 1; }
        }

        @keyframes pn-n-pulse {
          0%,100% { transform: scale(1);    opacity: 1; }
          50%      { transform: scale(1.07); opacity: 0.9; }
        }

        .pn-loader-wrap {
          position: fixed;
          inset: 0;
          background: #0D0D0D;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .pn-logo-svg {
          width: 120px;
          height: 120px;
          animation:
            pn-logo-appear 0.4s ease-out both,
            pn-n-pulse 2.1s ease-in-out 0.4s infinite;
        }

        /* Music waveform bars — left side of N */
        .pn-wave-1 {
          animation: pn-wave-pulse 2.1s ease-in-out 0.3s infinite;
          transform-origin: bottom;
        }
        .pn-wave-2 {
          animation: pn-wave-pulse 2.1s ease-in-out 0.45s infinite;
          transform-origin: bottom;
        }
        .pn-wave-3 {
          animation: pn-wave-pulse 2.1s ease-in-out 0.6s infinite;
          transform-origin: bottom;
        }

        /* Play button triangle — center of N */
        .pn-play-icon {
          animation: pn-play-glow 2.1s ease-in-out 0.75s infinite;
        }

        /* Gamepad dots — top right of N */
        .pn-game-icon {
          animation: pn-game-glow 2.1s ease-in-out 1.05s infinite;
        }

        /* Download arrow — bottom right of N */
        .pn-dl-icon {
          animation: pn-dl-glow 2.1s ease-in-out 1.35s infinite;
        }
      `}</style>

      <div className="pn-loader-wrap">
        <svg
          className="pn-logo-svg"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ── Red rounded square background ── */}
          <rect
            x="0" y="0" width="200" height="200"
            rx="44" ry="44"
            fill="#CC0000"
          />

          {/* ── N shape — main white body ── */}
          {/* Left vertical bar */}
          <rect x="32" y="38" width="30" height="124" rx="8" fill="white" />
          {/* Right vertical bar */}
          <rect x="138" y="38" width="30" height="124" rx="8" fill="white" />
          {/* Diagonal stroke top-left to bottom-right */}
          <path
            d="M62 48 L138 148"
            stroke="white"
            strokeWidth="30"
            strokeLinecap="round"
          />

          {/* ── Music waveform bars — left side ── */}
          <g className="pn-wave-1" fill="#CC0000">
            <rect x="20" y="84" width="5" height="20" rx="2.5" />
          </g>
          <g className="pn-wave-2" fill="#CC0000">
            <rect x="28" y="78" width="5" height="32" rx="2.5" />
          </g>
          <g className="pn-wave-3" fill="#CC0000">
            <rect x="36" y="88" width="5" height="14" rx="2.5" />
          </g>

          {/* ── Play button triangle — center ── */}
          <g className="pn-play-icon">
            <path
              d="M91 82 L91 118 L119 100 Z"
              fill="#CC0000"
            />
          </g>

          {/* ── Gamepad icon — top right ── */}
          <g className="pn-game-icon" fill="#CC0000">
            {/* Gamepad body */}
            <rect x="144" y="36" width="22" height="16" rx="5" />
            {/* Buttons dots */}
            <circle cx="150" cy="42" r="2" fill="white" />
            <circle cx="158" cy="42" r="2" fill="white" />
            <circle cx="154" cy="38" r="2" fill="white" />
            <circle cx="154" cy="46" r="2" fill="white" />
          </g>

          {/* ── Download arrow — bottom right ── */}
          <g className="pn-dl-icon" fill="#CC0000">
            {/* Arrow line */}
            <rect x="158" y="140" width="4" height="18" rx="2" />
            {/* Arrow head */}
            <path
              d="M152 152 L160 164 L168 152 Z"
            />
          </g>
        </svg>
      </div>
    </>
  )
}
