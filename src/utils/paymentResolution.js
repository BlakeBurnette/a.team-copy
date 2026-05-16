const normalize = (value) => String(value || '').toLowerCase();

export const terminalStatuses = ['succeeded', 'exhausted', 'failed', 'canceled', 'compatibility_required'];

export function resolutionGuidance(resolution = {}) {
  const status = normalize(resolution.resolution_status || resolution.status || resolution.state);
  const code = normalize(resolution.resolution_code || resolution.code);
  const nextRetry = resolution.next_retry_at || resolution.retry_at;
  const allowed = Array.isArray(resolution.allowed_actions) ? resolution.allowed_actions : [];

  const actionFromAllowed = (fallback) => {
    if (allowed.includes('authenticate')) return { action: 'authenticate', actionLabel: 'Authenticate' };
    if (allowed.includes('update_method')) return { action: 'update_method', actionLabel: 'Update payment method' };
    if (allowed.includes('retry_now')) return { action: 'retry_now', actionLabel: 'Retry now' };
    if (allowed.includes('contact_support')) return { action: 'contact_support', actionLabel: 'Contact support' };
    if (fallback) return fallback;
    return { action: null, actionLabel: null };
  };

  if (status === 'succeeded') {
    return {
      title: 'Paid',
      description: 'Payment completed and a receipt is recorded.',
      action: null,
      actionLabel: null,
    };
  }

  if (status === 'requires_customer_action' || status === 'requires_action') {
    return {
      title: 'Authenticate payment',
      description: 'Complete a quick bank/card authentication to finish.',
      ...actionFromAllowed({ action: 'authenticate', actionLabel: 'Authenticate' }),
    };
  }

  if (status === 'payment_method_required') {
    return {
      title: 'Update payment method',
      description: 'Add or update your card so we can complete the charge.',
      ...actionFromAllowed({ action: 'update_method', actionLabel: 'Update payment method' }),
    };
  }

  if (status === 'retry_scheduled' || code === 'insufficient_funds') {
    return {
      title: 'We’ll retry',
      description: nextRetry
        ? `Another attempt is scheduled for ${new Date(nextRetry).toLocaleString()}. You can retry now.`
        : 'Another attempt is scheduled soon. You can retry now.',
      ...actionFromAllowed({ action: 'retry_now', actionLabel: 'Retry now' }),
    };
  }

  if (code === 'transient') {
    return {
      title: 'Temporary issue',
      description: 'We’re retrying automatically. You can refresh status anytime.',
      ...actionFromAllowed(),
    };
  }

  if (status === 'exhausted' || status === 'failed' || status === 'compatibility_required' || status === 'unknown') {
    return {
      title: 'Payment could not be completed',
      description: 'Please update your payment method or contact support for help.',
      ...actionFromAllowed({ action: 'contact_support', actionLabel: 'Contact support' }),
    };
  }

  return {
    title: 'Payment in progress',
    description: 'We are processing your payment securely.',
    ...actionFromAllowed(),
  };
}

export function shouldShowResolutionBanner(status) {
  const normalized = normalize(status);
  return ['requires_customer_action', 'requires_action', 'payment_method_required', 'retry_scheduled'].includes(
    normalized
  );
}
