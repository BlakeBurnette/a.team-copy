// src/pages/CareersPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  Users,
  Heart,
  Globe,
  Briefcase,
  ArrowRight,
  X,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

const JOB_DESCRIPTIONS = {
  'Senior Full-Stack Engineer': {
    about: "We're looking for a Senior Full-Stack Engineer to help build the future of service business payments. You'll work across our React frontend and Node.js backend to ship features that help thousands of businesses get paid faster.",
    responsibilities: [
      'Design and implement new features across the full stack',
      'Write clean, maintainable, and well-tested code',
      'Collaborate with product and design to shape the roadmap',
      'Mentor junior engineers and contribute to engineering culture',
      'Participate in code reviews and architectural decisions',
    ],
    requirements: [
      '5+ years of professional software development experience',
      'Strong proficiency in React and modern JavaScript/TypeScript',
      'Experience with Node.js and relational databases',
      'Familiarity with payment systems (Stripe, ACH) is a plus',
      'Excellent communication and collaboration skills',
    ],
    compensation: 'Competitive salary + equity',
  },
  'Customer Success Manager': {
    about: "We're looking for a Customer Success Manager to help our customers thrive. You'll be the primary point of contact for our business customers, ensuring they get maximum value from PayHive.",
    responsibilities: [
      'Onboard new customers and drive product adoption',
      'Build strong relationships with key accounts',
      'Identify upsell and expansion opportunities',
      'Gather customer feedback and advocate internally',
      'Create resources and documentation to scale support',
    ],
    requirements: [
      '2+ years in customer success, account management, or similar',
      'Excellent written and verbal communication',
      'Experience with SaaS or B2B products',
      'Problem-solving mindset and attention to detail',
      'Comfortable with CRM tools and data analysis',
    ],
    compensation: 'Competitive salary + equity',
  },
  'Sales Development Representative (Remote)': {
    about: "We're hiring US-based cold callers to book qualified demos for residential and commercial service businesses (landscaping, HVAC, pest control, cleaning, pressure washing, etc.). You will not close deals — your job is to generate high-quality, attended demos with decision-makers. This is a remote, 1099 contractor role with strong performance upside and clear expectations.",
    responsibilities: [
      'Make outbound cold calls to small–mid-sized service businesses',
      'Identify decision-makers (owners / operators)',
      'Qualify prospects based on provided ICP',
      'Book demos on our calendar with correct information',
      'Log all activity accurately in CRM',
      'Follow approved scripts and objection-handling frameworks',
      'Maintain professionalism and compliance at all times',
    ],
    requirements: [
      'US-based',
      'Prior cold calling or outbound sales experience (B2B preferred)',
      'Reliable internet, quiet workspace, and computer',
      'Comfortable making 50–70 calls/day',
      'Coachable and metrics-driven',
      'Available during US business hours',
      'No degree required. No industry experience required.',
    ],
    compensation: '$1,200–$1,500/month base + $75 per qualified demo attended + $300 per deal closed. Top performers earn $3,000–$4,000+/month.',
    successMetrics: [
      '10–15 qualified demos booked per month',
      'Strong demo show rate',
      'Clean CRM hygiene',
      'Consistent daily activity',
    ],
  },
  'Account Executive (Outbound, Early Stage)': {
    about: "We're hiring an Account Executive to help build the outbound sales engine of a growing payments/fintech platform serving home and field service businesses (landscaping, HVAC, cleaning, pest control, pressure washing, etc.). This is an early-stage, hands-on role. You will prospect, run demos, and close deals. You'll work closely with the founder to refine messaging, ICP, and sales process as the company scales. This role is best suited for someone who enjoys ownership, accountability, and performance-based upside.",
    responsibilities: [
      'Conduct outbound cold calls to SMB owners and operators',
      'Identify and qualify decision-makers',
      'Book and run discovery calls and demos',
      'Close new customers consistently',
      'Manage short sales cycles (typically 7–21 days)',
      'Maintain accurate CRM records',
      'Follow approved scripts and objection-handling frameworks',
      'Provide feedback on messaging, objections, and ICP fit',
    ],
    requirements: [
      'Prior outbound or quota-carrying sales experience (B2B preferred)',
      'Comfortable cold calling and handling objections',
      'Self-directed and organized in a remote environment',
      'Clear communicator with strong follow-up habits',
      'Based in the United States',
      'No degree required. No specific industry experience required.',
    ],
    compensation: '$2,000/month base (1099) + tiered commission based on customer size. Small accounts: $150 upfront + 20% residual. Medium accounts: $400 upfront + 20% residual. Large accounts: $600 upfront + 20% residual. Residuals paid monthly for 12 months. Total comp: $67k–$106k Year 1, $85k–$140k+ Year 2 at steady state. No commission caps.',
    notIncluded: [
      'Not an inbound-only role',
      'Not an account management or support role',
      'Not a long-cycle enterprise sales role',
      'This role is focused on new customer acquisition',
    ],
    growthOpportunity: [
      'A pure closing role',
      'A senior AE position',
      'A leadership role supporting additional sales hires',
    ],
  },
};

export default function CareersPage() {
  const [selectedJob, setSelectedJob] = useState(null);

  const openings = [
    { title: 'Senior Full-Stack Engineer', location: 'Remote', type: 'Full-time', department: 'Engineering' },
    { title: 'Customer Success Manager', location: 'Remote', type: 'Full-time', department: 'Operations' },
    { title: 'Sales Development Representative (Remote)', location: 'US Only', type: 'Contract', department: 'Sales' },
    { title: 'Account Executive (Outbound, Early Stage)', location: 'US Only', type: 'Contract', department: 'Sales' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="text-white py-20" style={{ backgroundColor: '#2e2e2e' }}>
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Join the Hive</h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            We're building the future of service business payments. Come help us empower
            thousands of businesses to get paid faster and grow smarter.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Mission */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Service businesses are the backbone of local economies. Landscapers, cleaners,
            contractors, and countless others work hard every day — they deserve tools that
            work just as hard for them. We're on a mission to eliminate the friction between
            doing great work and getting paid for it.
          </p>
        </section>

        {/* Values */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">What We Value</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ValueCard
              icon={Zap}
              title="Bias for Action"
              description="We ship fast, learn faster. Perfect is the enemy of progress. Get it out there, get feedback, iterate."
            />
            <ValueCard
              icon={Users}
              title="Customer Obsession"
              description="Every decision starts with 'how does this help our customers?' We succeed when they succeed."
            />
            <ValueCard
              icon={Heart}
              title="Give a Damn"
              description="We care deeply about our work, our teammates, and our impact. No one here is just collecting a paycheck."
            />
            <ValueCard
              icon={Globe}
              title="Default to Transparency"
              description="Information flows freely. We share context, admit mistakes openly, and trust each other with the full picture."
            />
          </div>
        </section>

        {/* Why Join */}
        <section className="mb-20 bg-gray-50 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-6">Why PayHive?</h2>
          <div className="space-y-4 text-gray-600">
            <p>
              <strong className="text-gray-900">Early stage, real traction.</strong> We're
              not a science project. Real businesses use PayHive every day to process real money.
              But we're early enough that you'll have massive impact on what we build next.
            </p>
            <p>
              <strong className="text-gray-900">Small team, big problems.</strong> You won't
              be a cog in a machine. You'll own entire features, talk directly to customers,
              and see your work in production within days, not quarters.
            </p>
            <p>
              <strong className="text-gray-900">No nonsense.</strong> We skip the
              unnecessary meetings and performative work. Substance over optics —
              we measure success by impact, not activity.
            </p>
          </div>
        </section>

        {/* Open Positions */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Open Positions</h2>
          <div className="space-y-4">
            {openings.map((job, i) => (
              <button
                key={i}
                onClick={() => setSelectedJob(job)}
                className="w-full text-left border rounded-xl p-6 hover:border-amber-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-amber-600 transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{job.department}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Don't see a fit */}
        <section className="bg-amber-50 rounded-2xl p-8 md:p-12 text-center">
          <Briefcase className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Don't See Your Role?</h2>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            We're always looking for exceptional people. If you're passionate about what
            we're building, reach out anyway. The right person is more important than the right job title.
          </p>
          <a
            href="mailto:careers@thepayhive.com?subject=General Application"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Get in Touch
            <ArrowRight className="w-4 h-4" />
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} PayHive. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link to="/legal/terms" className="hover:text-gray-900">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link to="/security" className="hover:text-gray-900">Security</Link>
            <Link to="/" className="hover:text-gray-900">Home</Link>
          </div>
        </div>
      </footer>

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          details={JOB_DESCRIPTIONS[selectedJob.title]}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function ValueCard({ icon: Icon, title, description }) {
  return (
    <div className="border rounded-xl p-6">
      <Icon className="w-8 h-8 text-amber-500 mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function JobModal({ job, details, onClose }) {
  if (!details) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - full screen on mobile, centered card on desktop */}
      <div className="relative min-h-screen flex items-end sm:items-center justify-center sm:p-4">
        <div className="relative bg-white w-full sm:rounded-2xl shadow-xl sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex items-start justify-between z-10">
            <div className="pr-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{job.title}</h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  {job.type}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4" />
                  {job.department}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute right-3 top-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6">
            {/* About */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">About the Role</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{details.about}</p>
            </section>

            {/* Responsibilities */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Responsibilities</h3>
              <ul className="space-y-2">
                {details.responsibilities.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm sm:text-base text-gray-600">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Requirements */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Requirements</h3>
              <ul className="space-y-2">
                {details.requirements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm sm:text-base text-gray-600">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Success Metrics (for SDR role) */}
            {details.successMetrics && (
              <section>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">What Success Looks Like</h3>
                <ul className="space-y-2">
                  {details.successMetrics.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm sm:text-base text-gray-600">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* What This Role Is Not (for AE role) */}
            {details.notIncluded && (
              <section className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">What This Role Is Not</h3>
                <ul className="space-y-2">
                  {details.notIncluded.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm sm:text-base text-gray-600">
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Growth Opportunity (for AE role) */}
            {details.growthOpportunity && (
              <section>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Growth Opportunity</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-2">As the company scales, this role may evolve into:</p>
                <ul className="space-y-2">
                  {details.growthOpportunity.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm sm:text-base text-gray-600">
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm sm:text-base text-gray-500 mt-2 italic">Growth is performance-based.</p>
              </section>
            )}

            {/* Compensation */}
            <section className="bg-amber-50 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                <h3 className="text-base sm:text-lg font-semibold">Compensation</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-700">{details.compensation}</p>
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-4 pb-6 sm:pb-4">
            <Link
              to={`/careers/apply/${encodeURIComponent(job.title)}`}
              className="block w-full text-center px-6 py-3.5 sm:py-3 bg-amber-500 text-white rounded-xl sm:rounded-lg hover:bg-amber-600 transition-colors font-medium text-base"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
