import React from 'react';
// These are in the SAME folder as this file:
import AddServicePanel from './AddServicePanel';
import AddMiscEventPanel from './AddMiscEventPanel';

export default function OwnerPanels({ teamOptions, orgBusinessHours, onRefresh }) {
  return (
    <>
      <AddServicePanel
        teamOptions={teamOptions}
        onSuccess={async () => { await onRefresh(); }}
      />
      <AddMiscEventPanel
        teamOptions={teamOptions}
        orgBusinessHours={orgBusinessHours}
        onSuccess={async () => { await onRefresh(); }}
      />
    </>
  );
}
