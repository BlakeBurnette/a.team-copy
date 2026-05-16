// src/pages/landing/RealEstateLanding.jsx
import React from 'react';
import { Users, Phone, FileText, Clock, Gift, Zap } from 'lucide-react';
import AudienceLanding from '../../components/AudienceLanding';

export default function RealEstateLanding() {
  return (
    <AudienceLanding
      audience="real-estate"
      seoTitle="PayHive for Real Estate Agents — Close Deals, Not Email Loops"
      seoDescription="Coordinate inspections, repairs, and vendors without the phone tag. One platform for agents, vendors, and clients. Free to start."

      heroTag="For Real Estate Agents"
      heroHeadline={<>Close deals, not <span style={{ color: '#E89A1C' }}>email loops.</span></>}
      heroSubheadline="Between inspections, repairs, and closing coordination, how much of your week is just keeping everyone updated?"
      heroSubtext="PayHive connects your vendors, clients, and transaction partners in one place — so you can sell homes instead of chasing callbacks."

      painTag="Every transaction, same grind"
      painHeadline="This is the part of the deal nobody talks about."
      painPoints={[
        { pain: 'Schedule the inspection', detail: '→ 4 calls to find a time that works' },
        { pain: 'Inspector finds issues', detail: '→ You relay to the buyer' },
        { pain: 'Buyer wants repair quotes', detail: '→ You call 3 contractors' },
        { pain: 'Contractor sends quote', detail: '→ You forward to buyer\'s agent' },
        { pain: 'Seller pushes back on price', detail: '→ Another round of calls' },
        { pain: 'Everyone asks: "What\'s the status?"', detail: '→ You answer the same question 5 times' },
      ]}
      painSummary={<>The deal isn't the hard part. <span style={{ color: '#FBAB2E' }}>The coordination is.</span></>}

      featuresHeadline="Every deal. Everyone aligned."
      featuresSubtext="Your vendors, clients, and partners — one shared view."
      features={[
        {
          icon: <Users className="h-6 w-6" />,
          title: 'Transaction Hub',
          subtitle: 'One place per deal.',
          desc: 'Inspectors, contractors, buyers, sellers, agents — everyone sees the same timeline and status. No more relay.',
        },
        {
          icon: <Phone className="h-6 w-6" />,
          title: 'Vendor Network',
          subtitle: 'Your go-to list, built in.',
          desc: 'Keep your preferred inspectors, contractors, and service providers in PayHive. Assign them to deals in seconds.',
        },
        {
          icon: <Gift className="h-6 w-6" />,
          title: 'Referral Rewards',
          subtitle: 'Share it. Earn free months.',
          desc: 'Refer another agent who signs up and pays? You get a free month. No cap. The more you share, the more you save.',
        },
      ]}

      comparison={{
        oldTitle: 'Without PayHive',
        oldSteps: [
          'Inspection needed — call around for availability',
          'Inspector finds issues — email the report around',
          'Buyer wants quotes — call contractors yourself',
          'Contractor sends quote — forward to buyer\'s agent',
          'Status check — answer the same question 5 times',
          'Close the deal — dig through texts for documentation',
        ],
        oldMetric: 'Average: 4-5 hours of coordination per transaction',
        newTitle: 'With PayHive',
        newSteps: [
          'Create transaction — invite all parties',
          'Assign vendors — they get notified instantly',
          'Everyone sees updates in real time',
          'Documentation and payments in one place',
        ],
        newMetric: 'Average: 30 minutes. Same deal, same parties.',
      }}
      comparisonTag="Time is money"
      comparisonHeadline="More closings. Less coordination."

      statsHeadline="Hours back in your week."
      stats={[
        { value: '4.5 hrs', label: 'per deal', detail: 'Average coordination time agents spend per transaction' },
        { value: '30 min', label: 'with PayHive', detail: 'Same transaction, same parties, a fraction of the overhead' },
        { value: '3x', label: 'more capacity', detail: 'Handle more deals when coordination doesn\'t eat your day' },
      ]}
      statsCta={{
        text: 'An agent closing 3 deals/month saves 12+ hours on coordination alone.',
        subtext: 'That\'s another deal you could be closing.',
      }}

      faqs={[
        {
          question: 'How does PayHive work for real estate agents?',
          answer: 'PayHive gives you a coordination hub for each transaction. Invite your inspectors, contractors, buyer/seller agents, and clients. Everyone sees the same timeline, status updates, and documents. When the inspector uploads a report or a contractor sends a quote, everyone who needs to see it — sees it. No forwarding required.',
        },
        {
          question: 'How does the referral program work?',
          answer: 'Every agent gets a unique referral link. When someone signs up through your link and makes their first payment, you get one month free on your subscription. There\'s no cap — refer 12 agents and you\'ve got a free year.',
        },
        {
          question: 'What does it cost?',
          answer: 'PayHive is available as a flat monthly subscription or per-transaction pricing, depending on your volume. Either way, it pays for itself in time saved on the first deal.',
        },
        {
          question: 'Can my clients see the status without creating an account?',
          answer: 'Yes. Clients get simple status updates via email or text notification. They can click through to see details if they want, but they don\'t need to create an account or download anything.',
        },
        {
          question: 'I already use Dotloop / SkySlope / transaction management software.',
          answer: 'Those tools are great for document management and e-signatures. PayHive handles the coordination layer — the vendor communication, scheduling, and status updates that happen between the documents. They\'re complementary, not competing.',
        },
      ]}

      ctaHeadline={<>Stop chasing callbacks.<br /><span style={{ color: '#FBAB2E' }}>Start closing more deals.</span></>}
      ctaSubtext="Every hour spent on coordination is an hour you're not prospecting, showing, or closing."
      ctaButtonText="See It In Action"
      ctaFootnote="10-minute demo. No pressure. Refer a friend and get a month free."
    />
  );
}
