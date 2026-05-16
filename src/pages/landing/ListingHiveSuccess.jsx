// src/pages/landing/ListingHiveSuccess.jsx
//
// Post-purchase landing page. Stripe redirects here with ?session_id=cs_live_...
// after a successful Listing Hive checkout.
//
// - Fetches claw.thehive.fyi/api/public/session/<id> to confirm the payment
//   (webhook may take 1-3s to land — page shows "Confirming..." and polls)
// - Shows tier + email + amount
// - Next-steps card with link to listings.thepayhive.com (the actual app)
// - Link to book a demo for onboarding help

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Mail, Calendar } from 'lucide-react';
import Header from '../../components/Header';
import AppFooter from '../../components/AppFooter';

const CLAW_BASE = 'https://claw.thehive.fyi';
const APP_URL = 'https://listings.thepayhive.com';
const DEMO_URL = `${CLAW_BASE}/book/demo-30`;

const GOLD = '#FFA11E';
const NAVY = '#2E2E2E';
const CREAM = '#FFF8EE';

export default function ListingHiveSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | pending | completed | error
  const [retries, setRetries] = useState(0);
  const [referral, setReferral] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = 'Welcome to Listing Hive — PayHive';
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }
    let cancelled = false;

    async function poll() {
      try {
        const r = await fetch(`${CLAW_BASE}/api/public/session/${encodeURIComponent(sessionId)}`);
        const j = await r.json();
        if (cancelled) return;
        if (j.ok && j.status === 'completed') {
          setSession(j);
          setStatus('completed');
        } else if (j.ok && j.status === 'pending') {
          // Webhook hasn't landed yet — retry up to 8 times over ~16s.
          if (retries < 8) {
            setTimeout(() => !cancelled && setRetries((r) => r + 1), 2000);
          } else {
            setStatus('pending');
          }
        } else {
          setStatus('error');
        }
      } catch (e) {
        if (!cancelled) setStatus('error');
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, retries]);

  // Once we have the customer email, fetch their referral code.
  useEffect(() => {
    if (status !== 'completed' || !session?.customer_email) return;
    let cancelled = false;
    fetch(`${CLAW_BASE}/api/public/referrals/by-email/${encodeURIComponent(session.customer_email)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.ok) setReferral(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, session?.customer_email]);

  return (
    <div className="min-h-screen" style={{ background: '#fff', color: NAVY }}>
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-16">
        {status === 'loading' && (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-transparent" style={{ borderTopColor: GOLD }} />
            <p className="mt-4 text-slate-600">Confirming your payment…</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-3">Your payment is processing</h1>
            <p className="text-slate-600 mb-6">
              Stripe confirmed the charge. Our system is still catching up. You'll get a welcome
              email in the next minute.
            </p>
            <a
              href={APP_URL}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: NAVY, textDecoration: 'none' }}
            >
              Open Listing Hive
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-3">Something went sideways</h1>
            <p className="text-slate-600 mb-6">
              We couldn't look up your checkout session. If your card was charged, you'll still get a
              welcome email. Otherwise{' '}
              <Link to="/listings" style={{ color: GOLD, fontWeight: 600 }}>
                try again
              </Link>
              .
            </p>
            <p className="text-sm text-slate-500">
              Questions? Email blake@thepayhive.com.
            </p>
          </div>
        )}

        {status === 'completed' && session && (
          <>
            <div className="text-center mb-10">
              <div
                className="inline-flex items-center justify-center rounded-full mb-4"
                style={{ background: CREAM, width: 72, height: 72 }}
              >
                <CheckCircle className="h-10 w-10" style={{ color: GOLD }} />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-3">You're in.</h1>
              <p className="text-lg text-slate-600">
                Welcome to {session.tier_label}. {session.amount_display} charged to{' '}
                <strong>{session.customer_email}</strong>.
              </p>
            </div>

            <div
              className="rounded-xl p-6 mb-6"
              style={{ background: CREAM, border: `1px solid ${GOLD}44` }}
            >
              <h2 className="text-lg font-bold mb-4">What happens next</h2>
              <ol className="space-y-4">
                <Step
                  n="1"
                  title="Check your email"
                  body="We just sent a welcome note to the address above with sign-in instructions."
                  icon={<Mail className="h-5 w-5" style={{ color: GOLD }} />}
                />
                <Step
                  n="2"
                  title="Open Listing Hive"
                  body="Sign in with the same email. Import your first active listing and Sir Walter starts tracking the transaction."
                  icon={<ArrowRight className="h-5 w-5" style={{ color: GOLD }} />}
                />
                <Step
                  n="3"
                  title="Add your team + vendors"
                  body="TCs, assistants, and preferred vendors. No extra seat charges."
                  icon={<ArrowRight className="h-5 w-5" style={{ color: GOLD }} />}
                />
              </ol>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <a
                href={APP_URL}
                className="flex-1 text-center py-3 rounded-lg font-bold text-white"
                style={{ background: NAVY, textDecoration: 'none' }}
              >
                Open Listing Hive
              </a>
              <a
                href={DEMO_URL}
                className="flex-1 text-center py-3 rounded-lg font-semibold"
                style={{
                  background: '#fff',
                  color: NAVY,
                  border: `1px solid ${NAVY}`,
                  textDecoration: 'none',
                }}
              >
                <Calendar className="inline h-4 w-4 mr-1" /> Book onboarding call
              </a>
            </div>

            {/* Referral card */}
            {referral && (
              <div
                className="mt-8 rounded-xl p-6"
                style={{ background: '#fff', border: `2px dashed ${GOLD}88` }}
              >
                <h3 className="font-bold text-lg mb-2">
                  Share Listing Hive — earn <span style={{ color: GOLD }}>20% off forever</span>
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Invite 3 realtors who sign up, and your subscription auto-discounts 20% for life.
                  {referral.lifetime_discount_active && (
                    <span style={{ color: GOLD, fontWeight: 600 }}> You've already unlocked it. 🎉</span>
                  )}
                  {!referral.lifetime_discount_active && referral.remaining_to_discount > 0 && (
                    <span>
                      {' '}
                      <strong>{referral.paid_count}</strong> of 3 paid referrals — {referral.remaining_to_discount} to go.
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 px-3 py-2 rounded text-sm"
                    style={{ background: CREAM, border: '1px solid #eee', overflow: 'hidden' }}
                  >
                    {referral.share_url}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referral.share_url).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    className="px-4 py-2 rounded text-sm font-semibold text-white"
                    style={{ background: GOLD, border: 'none', cursor: 'pointer' }}
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <AppFooter />
    </div>
  );
}

function Step({ n, title, body, icon }) {
  return (
    <li className="flex gap-4">
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white"
        style={{ background: '#FFA11E', width: 28, height: 28, fontSize: 14 }}
      >
        {n}
      </div>
      <div>
        <div className="font-semibold mb-1">{title}</div>
        <div className="text-sm text-slate-600">{body}</div>
      </div>
    </li>
  );
}
