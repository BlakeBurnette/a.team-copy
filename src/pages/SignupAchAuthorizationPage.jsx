import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AchAuthorizationCard from '../components/ach/AchAuthorizationCard';
import BankLinkStep from '../components/ach/BankLinkStep';
import { useUserProfile } from '../context/AuthContext';
import { fetchAchTerms, submitAchAuthorization } from '../api/ach';
import {
  createSessionId,
  getDeviceId,
  buildAchAuthorizationPayload,
} from '../utils/achAuthorization';

const ui = {
  bg: '#F7F7F8',
  text: '#1F2937',
  subtle: '#6B7280',
  accent: '#0E8A16',
  border: '#E5E7EB',
};

export default function SignupAchAuthorizationPage() {
  const { profile } = useUserProfile() || {};
  const userId = profile?.id || profile?.user_id || profile?.sub || '';

  const sessionId = useMemo(() => createSessionId(), []);
  const deviceId = useMemo(() => getDeviceId(), []);

  const [terms, setTerms] = useState(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  const [consentChecked, setConsentChecked] = useState(false);
  const [standingChecked, setStandingChecked] = useState(false);
  const [bankToken, setBankToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitDone, setSubmitDone] = useState(false);

  const requireStandingAck = !!(terms?.amountModel?.standingAuthorization || (terms?.amountModel?.frequency && terms.amountModel.frequency !== 'one-time'));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingTerms(true);
        setTermsError('');
        const data = await fetchAchTerms();
        if (alive) setTerms(data);
      } catch (e) {
        if (alive) setTermsError('Unable to load ACH authorization terms.');
      } finally {
        if (alive) setLoadingTerms(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const logCheckboxEvent = useCallback((checked) => {
    try {
      const evt = new CustomEvent('ach_authorization_checkbox', {
        detail: { checked, sessionId, termsId: terms?.termsId || null },
      });
      window.dispatchEvent(evt);
    } catch {}
  }, [sessionId, terms]);

  const handleConsentChange = useCallback((checked) => {
    setConsentChecked(checked);
    logCheckboxEvent(checked);
  }, [logCheckboxEvent]);

  const onBankLinked = (details) => {
    setBankToken(details || null);
  };

  const readyToSubmit = consentChecked && (!requireStandingAck || standingChecked) && bankToken?.token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!readyToSubmit || submitting) return;
    try {
      setSubmitting(true);
      setSubmitError('');
      const payload = buildAchAuthorizationPayload({
        userId,
        terms,
        bank: { token: bankToken.token, bankName: bankToken.bankName, accountType: bankToken.accountType, last4: bankToken.last4 },
        sessionId,
        deviceId,
        standingAuthorizationAccepted: requireStandingAck ? standingChecked : false,
      });
      await submitAchAuthorization(payload, { sessionId, termsId: terms?.termsId });
      setSubmitDone(true);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: ui.bg }}>
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: ui.text }}>ACH Authorization</h1>
            <p className="text-sm" style={{ color: ui.subtle }}>
              Authorize WEB debit and standing authorization for future charges.
            </p>
          </div>
          <div className="text-xs text-right" style={{ color: ui.subtle }}>
            Session: {sessionId}
            <br />
            Device: {deviceId}
          </div>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <BankLinkStep onLinked={onBankLinked} linkedBank={bankToken} disabled={submitting} />

          <AchAuthorizationCard
            termsId={terms?.termsId}
            termsHash={terms?.termsHash}
            termsText={terms?.termsText || terms?.terms || ''}
            amountModel={terms?.amountModel || {}}
            revocationText={terms?.revocationText}
            accepted={consentChecked}
            onAcceptChange={handleConsentChange}
            requireStandingAck={requireStandingAck}
            standingAccepted={standingChecked}
            onStandingAccept={setStandingChecked}
          />

          {termsError ? <div className="text-sm text-red-600">{termsError}</div> : null}
          {submitError ? <div className="text-sm text-red-600">{submitError}</div> : null}
          {submitDone ? <div className="text-sm text-green-600">Authorization captured successfully.</div> : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={!readyToSubmit || submitting || loadingTerms}
              className="px-5 py-2 rounded-lg text-white font-semibold shadow disabled:opacity-60"
              style={{ backgroundColor: ui.accent }}
            >
              {submitting ? 'Submitting…' : 'Authorize ACH'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
