import axios from 'axios';

export async function previewCampaignSegment(campaignId, ruleJson = {}, headers) {
  if (!campaignId) throw new Error('campaign id is required');
  const { data } = await axios.post(
    `/api/portal/campaigns/${encodeURIComponent(campaignId)}/segment/preview`,
    ruleJson,
    { headers, withCredentials: true }
  );
  return data;
}
