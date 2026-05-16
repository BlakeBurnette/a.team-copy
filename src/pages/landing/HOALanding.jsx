// src/pages/landing/HOALanding.jsx
import React from 'react';
import { Users, Mail, ClipboardList, Eye, TreePine, DollarSign } from 'lucide-react';
import AudienceLanding from '../../components/AudienceLanding';

export default function HOALanding() {
  return (
    <AudienceLanding
      audience="hoa"
      seoTitle="PayHive for HOA Boards — One Place for Vendors, Residents, and Your Board"
      seoDescription="Stop managing your community over email chains nobody reads. PayHive connects your board, vendors, and residents in one platform."

      heroTag="For HOA Boards"
      heroHeadline={<>Your community deserves better than <span style={{ color: '#E89A1C' }}>email chains.</span></>}
      heroSubheadline="Running an HOA means coordinating landscapers, maintenance crews, and residents — usually over email threads that half the board doesn't read."
      heroSubtext="PayHive gives your board one place to manage vendors, communicate with homeowners, and track everything that's been done."

      painTag="Every board meeting, same story"
      painHeadline="This is how most HOAs operate."
      painPoints={[
        { pain: 'Landscaper didn\'t show up', detail: '→ Nobody noticed for a week' },
        { pain: 'Resident emails about the pool fence', detail: '→ Gets buried in the thread' },
        { pain: 'Board member asks "Did we pay the painter?"', detail: '→ Nobody\'s sure' },
        { pain: '47-reply email chain about the sidewalk repair', detail: '→ Half the board didn\'t read it' },
        { pain: 'New board member joins', detail: '→ Has zero context on anything' },
      ]}
      painSummary={<>Running a community shouldn't feel like <span style={{ color: '#FBAB2E' }}>herding cats.</span></>}

      featuresHeadline="One place for your entire community."
      featuresSubtext="Board, vendors, and residents — all on the same page."
      features={[
        {
          icon: <ClipboardList className="h-6 w-6" />,
          title: 'Vendor Tracking',
          subtitle: 'Know what\'s done and what\'s not.',
          desc: 'Track every vendor, every job, every payment. New board members get full context from day one.',
        },
        {
          icon: <Users className="h-6 w-6" />,
          title: 'Resident Updates',
          subtitle: 'No more reply-all chaos.',
          desc: 'Residents get clean status updates about community projects. They can see progress without emailing the board.',
        },
        {
          icon: <DollarSign className="h-6 w-6" />,
          title: 'Payment Coordination',
          subtitle: 'Vendor invoices, handled.',
          desc: 'Vendors submit work, board approves, payment flows. Full audit trail for every dollar spent.',
        },
      ]}

      comparison={{
        oldTitle: 'Without PayHive',
        oldSteps: [
          'Board member emails landscaper (CC: all)',
          'Landscaper replies to one person (not CC\'d)',
          'Residents email asking about the project',
          'Board discusses via 30-reply email thread',
          'Nobody tracks if the work was actually done',
          'Treasurer digs through emails for invoices at year-end',
        ],
        oldMetric: 'Result: Nobody has the full picture. Ever.',
        newTitle: 'With PayHive',
        newSteps: [
          'Board assigns vendor in PayHive',
          'Vendor sees scope, updates status as they work',
          'Residents see progress automatically',
          'Payment and documentation tracked in one place',
        ],
        newMetric: 'Result: Full visibility for board, vendors, and residents.',
      }}
      comparisonTag="A better way to run your community"
      comparisonHeadline="Every board member. Every vendor. One platform."

      statsHeadline="Built for the way boards actually work."
      stats={[
        { value: '47', label: 'emails', detail: 'Average thread length for a single community project' },
        { value: '3 hrs', label: 'per week', detail: 'Time board members spend chasing vendor updates' },
        { value: '100%', label: 'audit trail', detail: 'Every vendor, every job, every dollar — tracked and searchable' },
      ]}
      statsCta={{
        text: 'Boards half your size are already using PayHive.',
        subtext: 'Split across homeowner dues, it\'s pennies per door.',
      }}

      faqs={[
        {
          question: 'How does PayHive work for HOA boards?',
          answer: 'PayHive gives your board a shared workspace for vendor management and resident communication. Assign landscapers, maintenance crews, and contractors to projects. Track status, approve work, and process payments — all in one place. Residents can see updates without emailing the board.',
        },
        {
          question: 'How much does it cost for an HOA?',
          answer: 'PayHive is priced per community per month, depending on the number of homes. For most communities, it works out to a few cents per door per month when included in dues. A fraction of what you\'d pay a management company.',
        },
        {
          question: 'Can multiple board members access it?',
          answer: 'Yes. Every board member gets their own login with full visibility into vendors, projects, and payments. When board members rotate, new members get instant context on everything that\'s happened.',
        },
        {
          question: 'Do residents need to create accounts?',
          answer: 'No. Residents receive updates via email or text. They can optionally view a status page for community projects, but there\'s no mandatory sign-up or app download.',
        },
        {
          question: 'We already use a management company. Does PayHive replace that?',
          answer: 'PayHive can complement your management company or replace the coordination layer entirely. Many self-managed HOAs use PayHive instead of hiring a management company for day-to-day vendor coordination.',
        },
      ]}

      ctaHeadline={<>Stop managing your community<br /><span style={{ color: '#FBAB2E' }}>over email chains.</span></>}
      ctaSubtext="Your board does this on top of full-time jobs. Give them a tool that respects their time."
      ctaButtonText="See It In Action"
      ctaFootnote="10-minute demo. Built for volunteer boards, not enterprise IT departments."
    />
  );
}
