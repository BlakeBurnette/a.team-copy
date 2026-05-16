// src/pages/landing/VendorsLanding.jsx
import React from 'react';
import { Zap, Camera, Users, DollarSign, Calendar, Shield } from 'lucide-react';
import AudienceLanding from '../../components/AudienceLanding';

export default function VendorsLanding() {
  return (
    <AudienceLanding
      audience="vendors"
      seoTitle="PayHive for Vendors — Get Paid Faster, Get More Work"
      seoDescription="Stop chasing payments and juggling texts from 10 different property managers. PayHive gives you clear scope, automatic payments, and a steady pipeline."

      heroTag="For Vendors & Contractors"
      heroHeadline={<>Clear scope. Instant pay. <span style={{ color: '#E89A1C' }}>More work.</span></>}
      heroSubheadline="Your property managers, agents, and HOA boards are already on PayHive. When they assign you a job, you get the scope, the address, and the timeline — no phone tag."
      heroSubtext="When you finish the job, payment happens automatically. No invoice to send. No 30-day wait."

      painTag="The vendor's reality"
      painHeadline="This is what getting work looks like today."
      painPoints={[
        { pain: 'PM texts you about a job', detail: '→ Half the details are missing' },
        { pain: 'You call back for the address', detail: '→ They\'re on another call' },
        { pain: 'You do the work, send an invoice', detail: '→ Crickets for 2 weeks' },
        { pain: 'You send a reminder', detail: '→ "We\'ll process it next cycle"' },
        { pain: 'Meanwhile, 4 other PMs are texting you', detail: '→ All on different threads' },
      ]}
      painSummary={<>You didn't start a business to <span style={{ color: '#FBAB2E' }}>chase payments.</span></>}

      featuresHeadline="Show up. Do the work. Get paid."
      featuresSubtext="That's how it should work. Now it does."
      features={[
        {
          icon: <Calendar className="h-6 w-6" />,
          title: 'Clear Work Orders',
          subtitle: 'Everything you need, upfront.',
          desc: 'Address, scope, contact info, photos of the issue — all in one place before you roll the truck.',
        },
        {
          icon: <Zap className="h-6 w-6" />,
          title: 'Automatic Payment',
          subtitle: 'No invoice. No waiting.',
          desc: 'Mark the job complete, capture your photos, and payment is triggered automatically. The billing cycle is gone.',
        },
        {
          icon: <Camera className="h-6 w-6" />,
          title: 'Proof of Service',
          subtitle: 'Disputes become impossible.',
          desc: 'Photos, timestamps, GPS — cryptographically sealed. When someone says "that wasn\'t done," you have undeniable proof.',
        },
      ]}

      comparison={{
        oldTitle: 'Without PayHive',
        oldSteps: [
          'Get a text with half the details',
          'Call back to clarify scope',
          'Do the work',
          'Create and send an invoice',
          'Wait 15-45 days',
          'Send a reminder',
          'Maybe get paid',
        ],
        oldMetric: 'Average: 45 days to get paid. 5-10% write-offs.',
        newTitle: 'With PayHive',
        newSteps: [
          'Get a clear work order with full details',
          'Do the work + capture photos',
          'Payment triggers automatically',
        ],
        newMetric: 'Average: Paid same day. Zero write-offs.',
      }}
      comparisonTag="The old way is broken"
      comparisonHeadline="From 45 days to instant."

      statsHeadline="The numbers speak for themselves."
      stats={[
        { value: '$0', label: 'to join', detail: 'PayHive is free for vendors. Your property managers and clients cover the platform.' },
        { value: '0 days', label: 'to get paid', detail: 'Pre-authorized payments settle automatically when work is verified.' },
        { value: 'Zero', label: 'invoices to send', detail: 'The invoice never exists. Work done → payment captured → done.' },
      ]}
      statsCta={{
        text: 'The average contractor loses $50,000/year to slow payments, disputes, and write-offs.',
        subtext: 'PayHive eliminates all three. And it\'s free for vendors.',
      }}

      faqs={[
        {
          question: 'Is PayHive really free for vendors?',
          answer: 'Yes. Vendors pay nothing to use PayHive. The property managers, agents, and HOA boards who assign you work pay for the platform. You just show up, do the work, and get paid.',
        },
        {
          question: 'How do I get work through PayHive?',
          answer: 'Your existing clients (property managers, agents, HOAs) invite you to their PayHive account. When they have a job, they assign it to you through the platform. You can also be discovered by new clients in the PayHive vendor network.',
        },
        {
          question: 'How does the instant payment work?',
          answer: 'When the property manager or client sets up a job, payment is pre-authorized. When you complete the work and capture verification photos, payment is triggered automatically. No invoice to send, no waiting period.',
        },
        {
          question: 'What types of vendors use PayHive?',
          answer: 'Plumbers, electricians, HVAC technicians, landscapers, roofers, painters, cleaners, pest control, pool maintenance, general contractors — any service provider who works with property managers, real estate agents, or HOA boards.',
        },
        {
          question: 'Can I use PayHive alongside my existing invoicing?',
          answer: 'Absolutely. Many vendors start by using PayHive for the clients who invite them, while keeping their existing systems for other clients. Over time, most vendors prefer the PayHive workflow because it eliminates invoicing entirely.',
        },
      ]}

      ctaHeadline={<>Stop chasing payments.<br /><span style={{ color: '#FBAB2E' }}>Start getting paid instantly.</span></>}
      ctaSubtext="Join the vendors who eliminated invoicing and never looked back. Free forever for vendors."
      ctaButtonText="Get Started Free"
      ctaFootnote="Free for vendors. Set up in 2 minutes. No credit card required."
    />
  );
}
