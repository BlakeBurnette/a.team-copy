import { useState } from 'react';

export function useCompleteWithPhotos({ ruleId, onAfterComplete }) {
  const [showModal, setShowModal] = useState(false);

  async function callComplete() {
    await fetch(`/api/schedule/${ruleId}/complete`, { method: 'POST' });
    onAfterComplete?.();
  }

  function start() { setShowModal(true); }
  function finish() { setShowModal(false); callComplete(); }

  return { showModal, setShowModal, start, finish, callComplete };
}
