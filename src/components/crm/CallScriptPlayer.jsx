import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, RotateCcw, CheckCircle, XCircle, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';
import EmbeddedSiteBuilder from './EmbeddedSiteBuilder';

export default function CallScriptPlayer({ script, onClose, repName }) {
  const [currentStep, setCurrentStep] = useState(script.startStep || 'opener');
  const [formData, setFormData] = useState({});

  // Replace [YOUR NAME] with actual rep name in script text
  const replaceRepName = (text) => {
    if (!text) return text;
    const name = repName || '[YOUR NAME]';
    return text.replace(/\[YOUR NAME\]/g, name);
  };

  const showStep = (stepId) => {
    setCurrentStep(stepId);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const reset = () => {
    setCurrentStep(script.startStep || 'opener');
    setFormData({});
  };

  const currentStepData = script.steps[currentStep];

  if (!currentStepData) return null;

  // Get step number for display
  const stepKeys = Object.keys(script.steps);
  const currentStepIndex = stepKeys.indexOf(currentStep) + 1;

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{script.title}</h3>
            <p className="text-sm text-gray-500">{currentStepData.header}</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Start Over
        </button>
      </div>

      {/* Step Content */}
      <div className="animate-fadeIn">
        {/* Say blocks - Script text */}
        {currentStepData.say && currentStepData.say.length > 0 && (
          <div className="p-6 space-y-4">
            {currentStepData.say.map((text, i) => (
              <div key={i} className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-full" />
                <div className="pl-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">Say</span>
                  </div>
                  <p
                    className="text-gray-800 text-base leading-relaxed whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: replaceRepName(text).replace(/class="text-amber-400"/g, 'class="text-amber-600 font-semibold bg-amber-50 px-1 rounded"')
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes - Tips for the rep */}
        {currentStepData.notes && currentStepData.notes.length > 0 && (
          <div className="px-6 pb-4">
            {currentStepData.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 text-gray-500 text-sm italic">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}

        {/* External link button */}
        {currentStepData.exampleLink && (
          <div className="px-6 pb-4">
            <a
              href={currentStepData.exampleLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors"
            >
              {currentStepData.exampleLink.text}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Objections list */}
        {currentStepData.objections && currentStepData.objections.length > 0 && (
          <div className="px-6 pb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Common Objections & Responses</h4>
            <div className="space-y-3">
              {currentStepData.objections.map((obj, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-red-600 font-medium text-sm mb-2">"{obj.trigger}"</div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <ChevronRight className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <p className="text-gray-700 text-sm">{obj.response}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form fields (legacy - for simple scripts) */}
        {currentStepData.fields && !currentStepData.siteBuilder && (
          <div className="px-6 pb-6 space-y-4">
            {currentStepData.fields.map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        )}

        {/* Embedded Site Builder */}
        {currentStepData.siteBuilder && (
          <div className="p-6">
            <EmbeddedSiteBuilder
              onComplete={() => showStep(currentStepData.siteBuilder.onComplete)}
              onBack={currentStepData.siteBuilder.onBack ? () => showStep(currentStepData.siteBuilder.onBack) : undefined}
            />
          </div>
        )}

        {/* Success/End message */}
        {currentStepData.success && (
          <div className="mx-6 mb-6 flex items-center gap-3 bg-green-50 px-5 py-4 rounded-xl border border-green-200">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <span className="text-green-800 font-medium">{currentStepData.success}</span>
          </div>
        )}

        {currentStepData.endMessage && (
          <div className="px-6 pb-6">
            <p className="text-gray-500 text-sm">{currentStepData.endMessage}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStepData.buttons && currentStepData.buttons.length > 0 && (
          <div className="px-6 pb-6 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-3">
              {currentStepData.buttons.map((btn, i) => {
                const variants = {
                  yes: 'bg-green-600 hover:bg-green-700 text-white',
                  no: 'bg-red-500 hover:bg-red-600 text-white',
                  objection: 'bg-blue-500 hover:bg-blue-600 text-white',
                  back: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
                  reset: 'bg-amber-500 hover:bg-amber-600 text-white w-full mt-2',
                };

                return (
                  <button
                    key={i}
                    onClick={() => btn.action === 'reset' ? reset() : showStep(btn.goto)}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${variants[btn.variant] || variants.back}`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// PayHive Sales Script
export const PAYHIVE_SCRIPT = {
  id: 'payhive',
  title: 'PayHive Sales Script',
  description: 'Find pain, book demo for commercial landscapers',
  startStep: 'opener',
  steps: {
    opener: {
      header: 'Opener',
      say: [
        `Hey <strong class="text-amber-400">[NAME]</strong>, this is <strong class="text-amber-400">[YOUR NAME]</strong> with PayHive - quick question. How are you currently getting paid on your commercial jobs?`
      ],
      notes: [
        'Pause - let them talk.',
        'Listen for: Net 30/60 terms, chasing invoices, documentation requirements, disputes or slow payment'
      ],
      buttons: [
        { label: 'They mention pain', variant: 'yes', goto: 'dig-deeper' },
        { label: '"It\'s fine"', variant: 'no', goto: 'qualify-out' },
      ]
    },
    'dig-deeper': {
      header: 'Dig Deeper',
      say: [
        `How long does it usually take to get paid after a job is done?`,
        `What happens when a customer says you didn't show up or disputes the work?`,
        `Who handles all the documentation and invoice chasing?`
      ],
      notes: ['Listen for frustration. If real pain exists, move to pitch.'],
      buttons: [
        { label: 'Real pain exists', variant: 'yes', goto: 'pitch' },
        { label: 'No real pain', variant: 'no', goto: 'qualify-out' },
        { label: 'Back', variant: 'back', goto: 'opener' },
      ]
    },
    pitch: {
      header: 'Pitch',
      say: [
        `Here's what we do - PayHive lets your customers pre-authorize payment. Your crew shows up, takes GPS-tagged photos, and payment happens automatically when the job is done. <strong class="text-amber-400">No invoice. No chasing. No 30-day wait.</strong>

Plus you get cryptographic proof of every job - photos, timestamps, GPS - so disputes just go away.

Would it help to see how it works?`
      ],
      buttons: [
        { label: 'Interested', variant: 'yes', goto: 'book-demo' },
        { label: 'Objection', variant: 'objection', goto: 'objections' },
        { label: 'Hard no', variant: 'no', goto: 'end' },
        { label: 'Back', variant: 'back', goto: 'dig-deeper' },
      ]
    },
    objections: {
      header: 'Handle Objection',
      objections: [
        {
          trigger: 'We already have card on file',
          response: "Do you still send invoices and wait for approval? PayHive skips that step entirely - payment triggers automatically when work is verified. No manual invoicing."
        },
        {
          trigger: 'We use Jobber / ServiceTitan / etc',
          response: "Those are great for scheduling. But you're still invoicing and waiting to get paid, right? PayHive plugs into your workflow and handles the payment capture automatically."
        },
        {
          trigger: "We don't have problems getting paid",
          response: "Got it. How much time does your team spend on invoicing and documentation each week? Most of our customers didn't think they had a problem until they saw how much admin time they got back."
        },
        {
          trigger: 'I need to think about it',
          response: "Totally fair. Let me send you a quick video walkthrough. What's your email?"
        },
      ],
      buttons: [
        { label: 'Handled → Book Demo', variant: 'yes', goto: 'book-demo' },
        { label: 'Still no', variant: 'no', goto: 'end' },
        { label: 'Back to pitch', variant: 'back', goto: 'pitch' },
      ]
    },
    'qualify-out': {
      header: 'Qualify Out',
      say: [
        `Got it - sounds like you've got a good system. If you ever start taking on commercial work or add crews and need tighter documentation, give us a look. Have a good one.`
      ],
      notes: ['Use this for one-truck residential operations with no real pain.'],
      endMessage: 'Mark disposition and move on.',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    },
    'book-demo': {
      header: 'Book Demo',
      say: [
        `Let's set up 15 minutes so I can show you exactly how it works for <strong class="text-amber-400">[THEIR INDUSTRY]</strong>. What's your calendar look like this week?`
      ],
      notes: ['Collect: Day/time, Email, Best phone'],
      fields: [
        { name: 'datetime', label: 'Day/Time', placeholder: 'Tuesday at 2pm' },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'owner@company.com' },
        { name: 'phone', label: 'Best Phone', type: 'tel', placeholder: '(555) 123-4567' },
      ],
      buttons: [
        { label: 'Demo Booked!', variant: 'yes', goto: 'success' },
        { label: 'Back', variant: 'back', goto: 'pitch' },
      ]
    },
    success: {
      header: 'Success',
      say: [
        `Perfect. I'll send a calendar invite. Talk soon!`
      ],
      success: 'DEMO BOOKED - Send calendar invite!',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    },
    end: {
      header: 'End Call',
      say: [
        `No problem - if anything changes, we're here. Have a good one.`
      ],
      endMessage: 'Mark disposition and move on.',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    }
  }
};

// PayHive Upgrade Script (for existing Hive Sites customers)
export const PAYHIVE_UPGRADE_SCRIPT = {
  id: 'payhive-upgrade',
  title: 'PayHive Upgrade Script',
  description: 'Upgrade Hive Sites customers to PayHive',
  startStep: 'opener',
  steps: {
    opener: {
      header: 'Opener',
      say: [
        `Hey <strong class="text-amber-400">[NAME]</strong>, this is <strong class="text-amber-400">[YOUR NAME]</strong> from Hive Sites - how's the website working out for you?`,
        `Good to hear. Hey, quick question while I have you - how are you handling payments and scheduling right now?`
      ],
      notes: [
        'Let them answer first question - build rapport.',
        'Listen for: Manual invoicing, chasing payments, scheduling headaches, crew management, customer disputes'
      ],
      buttons: [
        { label: 'They mention pain', variant: 'yes', goto: 'dig-deeper' },
        { label: 'No pain signals', variant: 'no', goto: 'not-a-fit' },
      ]
    },
    'dig-deeper': {
      header: 'Dig Deeper',
      say: [
        `So when a job is done, what happens next? You send an invoice and wait?`,
        `How long does it usually take to actually get paid?`,
        `What do you do when a customer says the work wasn't done or disputes a charge?`,
        `Who's handling all that admin - you or someone else?`
      ],
      notes: ['Listen for frustration. If real pain exists, move to pitch.'],
      buttons: [
        { label: 'Real pain exists', variant: 'yes', goto: 'pitch' },
        { label: 'No real pain', variant: 'no', goto: 'not-a-fit' },
        { label: 'Back', variant: 'back', goto: 'opener' },
      ]
    },
    pitch: {
      header: 'Pitch',
      say: [
        `So the website is one piece of the puzzle - we also built PayHive, which handles the payment and scheduling side.

Here's how it works: your customer pre-authorizes payment when they sign up. Your crew does the job, takes a few photos, and payment happens automatically. <strong class="text-amber-400">No invoice. No waiting. No chasing.</strong>

And if a customer ever disputes the work, you've got GPS-tagged photos with timestamps proving exactly what was done and when.

A few of our Hive Sites customers have switched over and cut their admin time in half. Want to see how it would work for you?`
      ],
      buttons: [
        { label: 'Interested', variant: 'yes', goto: 'book-demo' },
        { label: 'Objection', variant: 'objection', goto: 'objections' },
        { label: 'Not interested', variant: 'no', goto: 'end' },
        { label: 'Back', variant: 'back', goto: 'dig-deeper' },
      ]
    },
    objections: {
      header: 'Handle Objection',
      objections: [
        {
          trigger: "I'm happy with my current setup",
          response: "Totally get it. Out of curiosity, how many hours a week do you spend on invoicing and chasing payments? Most people don't realize it until they add it up."
        },
        {
          trigger: 'I use QuickBooks / Jobber / etc',
          response: "Those are solid for what they do. The difference is you're still sending invoices and waiting. PayHive captures payment the moment work is verified - no manual step."
        },
        {
          trigger: "My customers won't pre-authorize",
          response: "That's what most people think at first. But customers actually like it - they know exactly what they're paying, and they don't have to remember to pay a bill. It's like how your phone bill works."
        },
        {
          trigger: 'Sounds expensive',
          response: "It's transaction-based - you only pay when you get paid. No monthly fee eating into your margins when business is slow."
        },
        {
          trigger: 'I need to think about it',
          response: "For sure. Let me send you a quick walkthrough video. If it makes sense, we can talk. What's your best email?"
        },
      ],
      buttons: [
        { label: 'Handled → Book Demo', variant: 'yes', goto: 'book-demo' },
        { label: 'Still no', variant: 'no', goto: 'end' },
        { label: 'Back to pitch', variant: 'back', goto: 'pitch' },
      ]
    },
    'not-a-fit': {
      header: 'Not a Fit',
      say: [
        `Got it - sounds like you've got things under control. If you ever add crews or start taking bigger jobs and want to tighten things up, let me know. Glad the website's working for you.`
      ],
      notes: ['Use this if they\'re too small or have no real pain.'],
      endMessage: 'Mark disposition and move on.',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    },
    'book-demo': {
      header: 'Book Demo',
      say: [
        `Let's do a quick 15-minute call so I can show you exactly how it works. What's your week look like?`
      ],
      fields: [
        { name: 'datetime', label: 'Day/Time', placeholder: 'Tuesday at 2pm' },
        { name: 'phone', label: 'Best Phone for Demo', type: 'tel', placeholder: '(555) 123-4567' },
      ],
      buttons: [
        { label: 'Demo Booked!', variant: 'yes', goto: 'success' },
        { label: 'Back', variant: 'back', goto: 'pitch' },
      ]
    },
    success: {
      header: 'Success',
      say: [
        `Perfect. I'll send a calendar invite. Talk soon!`
      ],
      success: 'DEMO BOOKED - Send calendar invite!',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    },
    end: {
      header: 'End Call',
      say: [
        `Appreciate the time - glad the site's working out. If anything changes, we're here.`
      ],
      endMessage: 'Mark disposition and move on.',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    }
  }
};

// PayHive Pain Finding Script (Research - not selling)
export const PAYHIVE_RESEARCH_SCRIPT = {
  id: 'payhive-research',
  title: 'PayHive Pain Finding Script',
  description: 'Research script - find pain, gather intel, NOT selling',
  startStep: 'opener',
  steps: {
    opener: {
      header: 'Opener',
      say: [
        `Hey <strong class="text-amber-400">[NAME]</strong>, this is <strong class="text-amber-400">[YOUR NAME]</strong> - I'm doing some research on how service companies handle their payments and job documentation. Got 3 minutes for a few quick questions? Not selling anything.`
      ],
      notes: ['If yes, continue. If no, thank them and move on.'],
      buttons: [
        { label: 'They have time', variant: 'yes', goto: 'q1-payment' },
        { label: 'No time', variant: 'no', goto: 'end' },
      ]
    },
    'q1-payment': {
      header: 'Q1: Payment Timeline',
      say: [
        `When your crew finishes a job, what happens next to actually get paid?`
      ],
      notes: [
        'Shut up. Let them talk. Take notes.',
        'Follow-up if needed: "How long from job done to money in your account?" or "Who handles that process?"'
      ],
      buttons: [
        { label: 'Next Question', variant: 'yes', goto: 'q2-documentation' },
        { label: 'Back', variant: 'back', goto: 'opener' },
      ]
    },
    'q2-documentation': {
      header: 'Q2: Documentation',
      say: [
        `Do your commercial clients or property managers require any proof of service - photos, reports, anything like that?`
      ],
      notes: [
        'Let them talk.',
        'Follow-up if needed: "How do you handle that right now?" or "How much time does that take?"'
      ],
      buttons: [
        { label: 'Next Question', variant: 'yes', goto: 'q3-disputes' },
        { label: 'Back', variant: 'back', goto: 'q1-payment' },
      ]
    },
    'q3-disputes': {
      header: 'Q3: Disputes',
      say: [
        `Have you ever had a customer say the work wasn't done, or dispute a charge?`
      ],
      notes: [
        'Let them talk.',
        'Follow-up if needed: "What happened?" or "How did you handle it?" or "How often does that come up?"'
      ],
      buttons: [
        { label: 'Next Question', variant: 'yes', goto: 'q4-admin' },
        { label: 'Back', variant: 'back', goto: 'q2-documentation' },
      ]
    },
    'q4-admin': {
      header: 'Q4: Admin Burden',
      say: [
        `If you added up all the time spent on invoicing, chasing payments, and documentation - what would that look like per week?`
      ],
      notes: [
        'Let them talk.',
        'Follow-up if needed: "Is that you or someone on your team?" or "What would you do with that time if you got it back?"'
      ],
      buttons: [
        { label: 'Next Question', variant: 'yes', goto: 'q5-tools' },
        { label: 'Back', variant: 'back', goto: 'q3-disputes' },
      ]
    },
    'q5-tools': {
      header: 'Q5: Current Tools',
      say: [
        `What are you using right now to manage all this - scheduling, invoicing, payments?`
      ],
      notes: [
        'Let them talk.',
        'Follow-up if needed: "How\'s that working for you?" or "What\'s the biggest gap?"'
      ],
      buttons: [
        { label: 'Next Question', variant: 'yes', goto: 'wrap-up' },
        { label: 'Back', variant: 'back', goto: 'q4-admin' },
      ]
    },
    'wrap-up': {
      header: 'Wrap Up',
      say: [
        `This is super helpful. One last question - if there was one thing about getting paid or managing jobs you could fix tomorrow, what would it be?`
      ],
      notes: [
        'Write down exactly what they say. This is gold.',
        'Then ask: "Really appreciate your time. If we build something that solves that, cool if I reach back out?"'
      ],
      buttons: [
        { label: 'Can follow up', variant: 'yes', goto: 'capture-info' },
        { label: 'No follow up', variant: 'no', goto: 'end-research' },
      ]
    },
    'capture-info': {
      header: 'Capture Info',
      say: [
        `What's the best email for you?`
      ],
      fields: [
        { name: 'email', label: 'Email', type: 'email', placeholder: 'owner@company.com' },
        { name: 'crews', label: 'Number of Crews', placeholder: '3' },
        { name: 'tools', label: 'Current Tools', placeholder: 'QuickBooks, paper' },
        { name: 'painpoint', label: 'Biggest Pain Point (their words)', placeholder: '' },
      ],
      buttons: [
        { label: 'Done - Log in CRM', variant: 'yes', goto: 'success' },
        { label: 'Back', variant: 'back', goto: 'wrap-up' },
      ]
    },
    success: {
      header: 'Success',
      say: [
        `Thanks so much - this really helps. I'll be in touch if we build something that fits.`
      ],
      success: 'RESEARCH COMPLETE - Log details in CRM!',
      notes: [
        'Log: Company name, contact, # crews, current tools, payment timeline, documentation requirements, dispute history, biggest pain point, follow-up status'
      ],
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    },
    'end-research': {
      header: 'End Research Call',
      say: [
        `No problem - really appreciate your time. This helps a lot.`
      ],
      endMessage: 'Log what you learned in CRM anyway - still valuable intel.',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    },
    end: {
      header: 'End Call',
      say: [
        `No problem - thanks anyway. Have a good one.`
      ],
      endMessage: 'Move on to next call.',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    }
  }
};

// Hive Sites Sales Script
export const HIVE_SITES_SCRIPT = {
  id: 'hive-sites',
  title: 'Hive Sites Sales Script',
  description: 'Interactive script for selling website services',
  startStep: 'opener',
  steps: {
    opener: {
      header: 'Step 1: Opener',
      say: [
        `Hey <strong class="text-amber-400">[NAME]</strong>, this is <strong class="text-amber-400">[YOUR NAME]</strong> with Hive Sites - I was looking online and couldn't find a website for <strong class="text-amber-400">[COMPANY]</strong>. Do you have one?`
      ],
      notes: ['Pause. Let them answer.'],
      buttons: [
        { label: 'They have one', variant: 'no', goto: 'has-website' },
        { label: 'No website', variant: 'yes', goto: 'pitch' },
        { label: 'Gatekeeper', variant: 'objection', goto: 'gatekeeper' },
      ]
    },
    gatekeeper: {
      header: 'Gatekeeper',
      say: [
        `Hey, I'm trying to reach the owner real quick - is <strong class="text-amber-400">[NAME]</strong> around?`
      ],
      notes: ['If they ask what it\'s about:'],
      buttons: [
        { label: 'Got through', variant: 'yes', goto: 'opener' },
        { label: 'No luck', variant: 'no', goto: 'end' },
        { label: 'Back', variant: 'back', goto: 'opener' },
      ]
    },
    'has-website': {
      header: 'They Have a Website',
      say: [
        `Got it — when's the last time you Googled <strong class="text-amber-400">'[THEIR SERVICE] near me'</strong> and saw yourself come up on the first page?`,
        `Yeah, that's what we fix. We build sites specifically for <strong class="text-amber-400">[INDUSTRY]</strong> companies - mobile-friendly, click-to-call, shows up when people search. $59.99 a month, no contract. Want to see what we'd build for you?`
      ],
      notes: ['If they don\'t show up or aren\'t sure, continue with second pitch.'],
      buttons: [
        { label: 'Interested', variant: 'yes', goto: 'collect' },
        { label: 'Not interested', variant: 'no', goto: 'end' },
        { label: 'Objection', variant: 'objection', goto: 'objections' },
        { label: 'Back', variant: 'back', goto: 'opener' },
      ]
    },
    pitch: {
      header: 'Step 2: Pitch',
      say: [
        `Here's the thing - when someone hears about you and Googles your business, if nothing comes up, they call someone else. We fix that.

We build websites for <strong class="text-amber-400">[INDUSTRY]</strong> companies. Mobile-friendly, click-to-call, shows up on Google. <strong class="text-amber-400">$59.99 a month</strong>, no contract, we do all the work.

Want to see an example?`
      ],
      exampleLink: {
        text: 'Show Example Site',
        url: 'https://hivesites360.com/s/test-landscaping-llc-ml1tcuvp'
      },
      buttons: [
        { label: "They're interested", variant: 'yes', goto: 'collect' },
        { label: 'Objection', variant: 'objection', goto: 'objections' },
        { label: 'Hard no', variant: 'no', goto: 'end' },
        { label: 'Back', variant: 'back', goto: 'opener' },
      ]
    },
    objections: {
      header: 'Handle Objection',
      objections: [
        {
          trigger: 'I get all my business from referrals',
          response: "That's great - but what happens when those referrals Google you before they call? If nothing comes up, some move on. This just makes sure you don't lose those."
        },
        {
          trigger: '$60/month is too much',
          response: "What's one job worth? Even a small one? One new customer covers the whole year. And you can cancel anytime."
        },
        {
          trigger: 'Send me info',
          response: "Best thing I can send is a preview of your actual site. Let me grab your info - you'll see it before you pay anything."
        },
        {
          trigger: 'I need to think about it',
          response: "Totally fair. Let me build the preview anyway - no charge. You see it, if you like it we move forward. If not, no hard feelings."
        },
        {
          trigger: "Had a website, didn't work",
          response: "Was it mobile-friendly? Click-to-call? Built for your industry? A lot of sites just sit there. We build ones that actually get found."
        },
      ],
      buttons: [
        { label: 'Handled → Interested', variant: 'yes', goto: 'collect' },
        { label: 'Still no', variant: 'no', goto: 'end' },
        { label: 'Back to pitch', variant: 'back', goto: 'pitch' },
      ]
    },
    collect: {
      header: 'Step 3: Build Their Site',
      say: [
        `Perfect — let me grab a few things so we can build your preview right now.`
      ],
      siteBuilder: {
        onComplete: 'close',
        onBack: 'pitch',
      },
    },
    close: {
      header: 'Step 4: Close',
      say: [
        `Alright, your site preview is ready! I just sent you a link to check it out.

Take a look, tell us any changes you want, and once you approve it, we'll get it live. <strong class="text-amber-400">$59.99 a month, cancel anytime.</strong>

Any questions?`,
        `Perfect. Check your texts for that preview link. Talk soon!`
      ],
      notes: ['If they have questions, address them. If ready, use the second line.'],
      success: 'SUCCESS - Site generated! Mark in PhoneBurner',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    },
    end: {
      header: 'End Call',
      say: [
        `No problem - if anything changes, we're here. Have a good one.`
      ],
      endMessage: 'Mark disposition in PhoneBurner and move on.',
      buttons: [
        { label: 'Start New Call', variant: 'reset', action: 'reset' },
      ]
    }
  }
};
