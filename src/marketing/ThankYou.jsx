import React from 'react';
import { Link } from 'react-router-dom';

export default function ThankYou() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-3xl font-bold mb-2">Thanks — we got it!</h2>
        <p className="text-neutral-700">
          We’ll reach out shortly to schedule your demo.
        </p>
        <Link to="/" className="inline-block mt-6 px-5 py-2 rounded bg-zinc-600 text-white">
          Back to home
        </Link>
      </div>
    </div>
  );
}
