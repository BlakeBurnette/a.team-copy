import React from 'react';
import { Leaf, Sun, Snowflake, Flower2, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getSeasonalCampaigns } from '../../config/seasonal.js';

const SEASON_ICONS = {
  spring: Flower2,
  summer: Sun,
  fall: Leaf,
  winter: Snowflake,
};

export default function SeasonalInsights({ activeCustomers = 0, onSwitchTab }) {
  const { user } = useAuth() || {};
  const industry = user?.organization?.industry || '';

  const seasonal = getSeasonalCampaigns(industry);

  if (!industry) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-amber-800">
          <Settings className="h-5 w-5" />
          <p className="text-sm font-medium">
            Set your industry in Settings to get seasonal recommendations.
          </p>
        </div>
      </div>
    );
  }

  if (!seasonal || seasonal.campaigns.length === 0) {
    return null;
  }

  const SeasonIcon = SEASON_ICONS[seasonal.season] || Sun;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SeasonIcon className="h-5 w-5 text-amber-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          {seasonal.seasonLabel} Campaigns
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {seasonal.campaigns.map((campaign) => (
          <div
            key={campaign.service}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-start gap-3">
              <SeasonIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  {campaign.service}
                </p>
                <p className="text-xs text-amber-700">{campaign.message}</p>
                {activeCustomers > 0 && (
                  <p className="text-xs text-amber-600">
                    {activeCustomers} active customers could benefit
                  </p>
                )}
                <button
                  type="button"
                  className="mt-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                  onClick={() => {
                    // Placeholder for campaign drafting
                  }}
                >
                  Draft Campaign
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
