import React from 'react';
import SirWalterCustomerIntro from './overview/SirWalterCustomerIntro';
import NeedsAttentionSection from './overview/NeedsAttentionSection';
import UpcomingServicesSection from './overview/UpcomingServicesSection';
import CustomerTimeline from './overview/CustomerTimeline';
import RecentActivityFeed from './overview/RecentActivityFeed';
import DraftsFromWalter from './overview/DraftsFromWalter';

export default function OverviewTab({ workspace, onViewHistory }) {
  const {
    customer,
    attention_items = [],
    upcoming_services = [],
    recent_activity = [],
    lifecycle = {},
    drafts = [],
  } = workspace || {};

  return (
    <div className="space-y-6">
      <SirWalterCustomerIntro customerName={customer?.name} workspace={workspace} />
      <NeedsAttentionSection items={attention_items} />
      <UpcomingServicesSection services={upcoming_services} />
      <CustomerTimeline lifecycle={lifecycle} />
      <DraftsFromWalter drafts={drafts} />
      <RecentActivityFeed events={recent_activity} onViewAll={onViewHistory} />
    </div>
  );
}
