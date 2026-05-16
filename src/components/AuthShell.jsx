import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const HiveMark = ({ className = 'h-10 w-auto' }) => (
  <svg
    className={className}
    viewBox="0 0 56.51 52"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#2e2e2e"
      d="M55.75,37.97s-.01.05-.01.07c-.35,1.53-1.72,2.63-3.3,2.63H5.02c-1.4,0-2.66-.86-3.16-2.18-.01-.02-.02-.04-.02-.06-.85-2.22.78-4.6,3.15-4.6h18.37c1.16,0,2.08-.94,2.08-2.08v-2.79c0-.41.35-.76.76-.76h5.33c.42,0,.76.34.76.76v2.79c0,1.15.94,2.08,2.08,2.08h18.08c2.18,0,3.78,2.02,3.3,4.14Z"
    />
    <path
      fill="#2e2e2e"
      d="M53.42,29.42h-12.84c-1.7,0-3.09-1.38-3.09-3.09v-.67c0-1.7,1.38-3.09,3.09-3.09h12.77c1.59,0,2.91,1.21,3.07,2.78.02.2.04.4.06.6,0,.04,0,.07.01.11.16,1.8-1.27,3.35-3.08,3.35Z"
    />
    <path
      fill="#2e2e2e"
      d="M40.81,6.84h-23.35c-1.7,0-3.09-1.38-3.09-3.09v-.67c0-1.7,1.38-3.09,3.09-3.09h23.28c1.59,0,2.91,1.21,3.07,2.78.02.2.04.4.06.6,0,.04,0,.07.01.11.16,1.8-1.27,3.35-3.08,3.35Z"
    />
    <path
      fill="#2e2e2e"
      d="M40.81,52h-23.35c-1.7,0-3.09-1.38-3.09-3.09v-.67c0-1.7,1.38-3.09,3.09-3.09h23.28c1.59,0,2.91,1.21,3.07,2.78.02.2.04.4.06.6,0,.04,0,.07.01.11.16,1.8-1.27,3.35-3.08,3.35Z"
    />
    <path
      fill="#2e2e2e"
      d="M20.06,25.66v.67c0,1.7-1.38,3.09-3.09,3.09H3.09c-1.78,0-3.2-1.51-3.08-3.29.02-.26.04-.52.06-.77,0,0,0-.02,0-.03.16-1.57,1.49-2.75,3.07-2.75h13.84c1.7,0,3.09,1.38,3.09,3.09Z"
    />
    <path
      fill="#2e2e2e"
      d="M51.01,18.12h-16.38c-1.15,0-2.08.93-2.08,2.08v2.28c0,.42-.34.76-.76.76h-5.32c-.42,0-.76-.34-.76-.76v-2.28c0-1.15-.93-2.08-2.08-2.08H6.74c-2.45,0-4.1-2.54-3.08-4.77.01-.03.03-.06.04-.09.55-1.2,1.75-1.98,3.08-1.98h44.21c1.46,0,2.75.93,3.21,2.32,0,.03.02.06.03.09.72,2.19-.91,4.43-3.22,4.43Z"
    />
  </svg>
);

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-neutral-100 px-4 py-10 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[55vh]"
        style={{
          background: 'linear-gradient(180deg, #ffbe4d 0%, #ff9d1c 100%)',
          clipPath: 'ellipse(120% 80% at 50% 0%)',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <HiveMark className="h-10 w-auto" />
          <h2 className="text-2xl md:text-3xl font-semibold" style={{ color: '#2e2e2e' }}>
            Welcome to the Hive!
          </h2>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-6 md:p-7 border border-neutral-200 space-y-4">
          {title ? <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1> : null}
          {subtitle ? <p className="text-neutral-700">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
