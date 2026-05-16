// src/pages/landing/PropertyManagersLanding.jsx
import React from 'react';
import { Users, MessageSquare, Wrench, Eye, Clock, Bell } from 'lucide-react';
import AudienceLanding from '../../components/AudienceLanding';

export default function PropertyManagersLanding() {
  return (
    <AudienceLanding
      audience="property-managers"
      seoTitle="PayHive for Property Managers — Stop Being the Switchboard"
      seoDescription="One platform to coordinate vendors, tenants, and property owners. Stop relaying messages and start managing properties. Free to start."

      heroTag="For Property Managers"
      heroHeadline={<>Stop being the <span style={{ color: '#E89A1C' }}>human switchboard.</span></>}
      heroSubheadline="Managing 50+ doors means you're relaying the same update to tenants, vendors, and owners — over text, email, and phone calls that fall through the cracks."
      heroSubtext="PayHive puts everyone on the same page. Tenants see status. Vendors get scope. Owners get updates. You get your time back."

      painTag="Sound familiar?"
      painHeadline="This is how most PMs spend their day."
      painPoints={[
        { pain: 'Tenant texts you about a leak', detail: '→ You text the plumber' },
        { pain: 'Plumber asks for the unit number', detail: '→ You text the tenant back' },
        { pain: 'Owner calls asking what happened', detail: '→ You explain it again' },
        { pain: 'Plumber no-shows', detail: '→ Start over from scratch' },
        { pain: 'End of month: "Where\'s the invoice?"', detail: '→ You dig through email' },
      ]}
      painSummary={<>What if everyone could just... <span style={{ color: '#FBAB2E' }}>see the same page?</span></>}

      featuresHeadline="One platform. Everyone aligned."
      featuresSubtext="No more being the middleman on every message."
      features={[
        {
          icon: <Users className="h-6 w-6" />,
          title: 'Shared Visibility',
          subtitle: 'Everyone sees the same status.',
          desc: 'Tenants, vendors, and owners all see real-time updates. Nobody calls you to ask "what\'s happening?"',
        },
        {
          icon: <Wrench className="h-6 w-6" />,
          title: 'Vendor Coordination',
          subtitle: 'Dispatch without the phone tag.',
          desc: 'Assign work to your preferred vendors. They get the scope, the address, and the timeline — instantly.',
        },
        {
          icon: <Bell className="h-6 w-6" />,
          title: 'Automatic Updates',
          subtitle: 'Set it and forget it.',
          desc: 'When a vendor updates status, tenants and owners get notified automatically. Zero forwarding required.',
        },
      ]}

      comparison={{
        oldTitle: 'Without PayHive',
        oldSteps: [
          'Tenant reports issue (text/email/call)',
          'You relay to vendor',
          'Vendor asks follow-up questions',
          'You relay back to tenant',
          'You update the owner',
          'Repeat for every status change',
          'Chase down the invoice at month-end',
        ],
        oldMetric: 'Average: 6+ hours/week on message relay alone',
        newTitle: 'With PayHive',
        newSteps: [
          'Tenant submits request in PayHive',
          'Vendor gets notified with full details',
          'Everyone sees real-time status updates',
          'Payment flows automatically on completion',
        ],
        newMetric: 'Average: 45 minutes/week. Same portfolio.',
      }}
      comparisonTag="The difference"
      comparisonHeadline="Same properties. A fraction of the work."

      statsHeadline="The math makes itself."
      stats={[
        { value: '6+ hrs', label: 'per week', detail: 'Average time PMs spend relaying messages between parties' },
        { value: '$2,500', label: 'per month', detail: 'Cost of a part-time coordinator to handle the same workload' },
        { value: '80%', label: 'fewer calls', detail: 'When tenants and owners can see status themselves' },
      ]}
      statsCta={{
        text: 'A PM with 100 doors paying $3/door saves $2,200/month vs. hiring a coordinator.',
        subtext: 'PayHive pays for itself in the first week.',
      }}

      faqs={[
        {
          question: 'How does PayHive work for property managers?',
          answer: 'PayHive connects your tenants, vendors, and property owners in one platform. When a maintenance request comes in, your vendor gets notified with full details. As work progresses, everyone — tenant, owner, and you — sees real-time status updates. No more forwarding messages or making phone calls to keep everyone in the loop.',
        },
        {
          question: 'How much does it cost?',
          answer: 'PayHive is priced per door per month, starting at just a few dollars per unit. For most property managers, this is a fraction of the cost of a part-time coordinator. We also earn a small processing fee when payments flow through the platform.',
        },
        {
          question: 'Can I use my existing vendors?',
          answer: 'Absolutely. You invite your preferred vendors to PayHive — it takes them 2 minutes to set up. They get clear work orders and a direct communication channel. Most vendors prefer it because they get fewer scattered texts and clearer scope.',
        },
        {
          question: 'What if my tenants aren\'t tech-savvy?',
          answer: 'Tenants interact through simple status updates and notifications. They don\'t need to download an app or learn a complex system. If they can read a text message, they can use PayHive.',
        },
        {
          question: 'How is this different from AppFolio or Buildium?',
          answer: 'Traditional property management software focuses on accounting and lease management. PayHive focuses on the coordination layer — the day-to-day communication between you, your vendors, and your tenants/owners that eats up your time. They can work together.',
        },
      ]}

      ctaHeadline={<>Stop relaying messages.<br /><span style={{ color: '#FBAB2E' }}>Start managing properties.</span></>}
      ctaSubtext="Every hour you spend forwarding texts is an hour you could spend growing your portfolio."
      ctaButtonText="See It In Action"
      ctaFootnote="10-minute demo. No pressure. See why PMs are switching."
    />
  );
}
