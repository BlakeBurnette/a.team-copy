import React, { useEffect } from 'react';
import { Lock } from 'lucide-react';
import Logo from '../components/Logo';
import AppFooter from '../components/AppFooter';
import { REDIRECT_URI } from '../auth/redirectUri';
import { useAuth } from '../context/AuthContext.jsx';

const abstract = [
  'This paper introduces a new payment model for field services: Invoiceless Architecture, a system where payment occurs automatically and atomically at the moment a service is verified, removing invoices as an operational workflow. The model leverages trust-object data structures, media-backed verification, worker-verified events, Merkle-tree integrity, and deterministic settlement workflows to make verified truth the trigger for payment.',
  'When settlement cannot occur immediately, the system enters Payment Resolution Mode to resolve payment rails (authentication, retries, method updates) while keeping the trust object as the canonical receipt. A billing artifact may be generated only as a rare compatibility layer when required by external systems.',
];

const paperSections = [
  {
    title: '1. Introduction',
    paragraphs: [
      'Field service industries rely on invoices as a proxy for trust: work is performed, paperwork is generated, payment is requested. This process has three persistent problems:',
    ],
    bullets: [
      'Friction: customers must manually review and pay.',
      'Delay: businesses wait days or weeks for settlement.',
      'Disputes: ambiguity around what happened, when, and by whom.',
    ],
    closing: [
      'Operationally, invoicing converts completed work into accounts receivable: the business shifts into a follow-up and collections posture, where revenue exists as an expectation rather than a settled outcome.',
      'The traditional invoice is not the source of truth. It is a summary of what supposedly occurred, produced after the moment where trust is actually earned.',
      'This architecture proposes a replacement: Trust First, Payment Second, No Invoice Workflow Required. By capturing verifiable service evidence at the moment of completion (and at key lifecycle moments such as approvals and change confirmations), and embedding cryptographic integrity into that evidence, payment becomes a deterministic consequence of verified work, not a separate billing workflow.',
    ],
  },
  {
    title: '2. Core Concepts',
    subsections: [
      {
        subtitle: '2.1 Trust Objects',
        paragraphs: [
          'A trust object is the atomic unit of truth in the invoiceless system. Each trust object includes:',
        ],
        bullets: [
          'Service record (structured event)',
          'Media artifacts (photos, videos)',
          'Metadata (timestamps, device signatures, optional location context)',
          'Crew identity',
          'Customer/property identifiers',
          'Hash proofs (per-media + record snapshot)',
        ],
        closing: [
          'This becomes the canonical receipt of reality.',
          'Trust objects are not limited to completion. They can represent key truth moments across the job lifecycle, including customer approvals (quote acceptance, add-on acceptance, change acceptance), change order confirmations and evidence attachments, completion verification, and operational work events (labor/time events, job start/stop events). Together, these form a single, verifiable job timeline rather than a fragmented set of documents.',
        ],
      },
      {
        subtitle: '2.2 Immutable Hashing',
        paragraphs: ['Each trust object is hashed using:'],
        bullets: [
          'SHA-256 leaf hashes for individual media',
          'A service record snapshot hash',
          'Merkle batching for scalability',
          'A sequential block hash referencing the prior batch',
        ],
        closing: 'This creates a tamper-evident chain without a public blockchain.',
      },
      {
        subtitle: '2.3 Moment-of-Truth Capture (Lifecycle Moments)',
        paragraphs: [
          'Instead of generating invoices after the fact, the system captures truth at the moment it matters, including:',
        ],
        bullets: [
          'Optional photos and evidence artifacts',
          'Notes',
          'Metadata and attestations (device, optional geo context)',
          'Identity validation (where applicable)',
        ],
        closing:
          'Upon submission, the record becomes tamper-evident: “This is what happened.” These truth moments drive deterministic downstream actions: approvals authorize and schedule work, changes are confirmed as structured deltas, and verified completion triggers settlement.',
      },
    ],
  },
  {
    title: '3. The Invoiceless Payment Lifecycle',
    subsections: [
      {
        subtitle: '3.1 Pre-Authorization',
        paragraphs: ['Before dispatch or at job start:'],
        bullets: [
          'Card pre-auth ensures available funds',
          'ACH pre-validation ensures account validity',
          'No charge occurs yet',
          'Only the ability to settle is verified',
          'This eliminates “work completed but card declined later.”',
        ],
      },
      {
        subtitle: '3.2 Completion to Verification',
        paragraphs: ['Upon job completion:'],
        bullets: [
          'Worker submits trust object (service completion package)',
          'Backend constructs the integrity package',
          'Hashing occurs automatically',
          'Trust object becomes tamper-evident',
          'Payment workflow begins',
        ],
      },
      {
        subtitle: '3.3 Automatic Settlement (No Invoice Workflow)',
        paragraphs: ['Settlement occurs via deterministic rules:'],
        bullets: [
          'If pre-auth exists, finalize charge',
          'If no pre-auth, charge immediately',
          'If charge fails, enter Payment Resolution Mode',
          'In the standard flow: Service is verified, payment occurs, no invoice workflow is initiated.',
        ],
      },
      {
        subtitle: '3.4 Payment Resolution Mode (Still Invoiceless)',
        paragraphs: [
          'If settlement cannot occur instantly (expired card, authentication required, ACH retry conditions, transient network failures), the system does not revert to manual billing.',
          'Instead it enters Payment Resolution Mode:',
        ],
        bullets: [
          'The customer receives a Service Completed + Proof record',
          'The customer is prompted to resolve the payment rail (authenticate, update method, choose backup)',
          'The system retries intelligently based on deterministic policy',
          'The trust object remains the canonical receipt',
          'Settlement occurs immediately when the rail is cleared',
          'This preserves the invoiceless architecture even when payments fail.',
        ],
      },
      {
        subtitle: '3.5 Compatibility Artifact (Rare / External Requirement)',
        paragraphs: [
          'In rare cases, external systems may require a billing artifact:',
        ],
        bullets: [
          'Certain B2B AP requirements',
          'Collections/legal procedures in some jurisdictions',
          'Processor evidence requirements in edge cases',
        ],
        closing:
          'In these situations, the system can generate a minimal billing artifact derived from the trust object. This artifact is not the source of truth. It is a compatibility layer, generated automatically and used only when required.',
      },
    ],
  },
  {
    title: '4. The Trust Object Data Model',
    paragraphs: [
      'A standardized JSON schema (summarized):',
    ],
    code: `{
  "service_record_id": "UUID",
  "organization_id": "UUID",
  "property_id": "UUID",
  "customer_id": "UUID",
  "crew_ids": ["UUID"],
  "timestamps": {
    "started_at": "timestamp",
    "completed_at": "timestamp",
    "verified_at": "timestamp"
  },
  "media": [
    {
      "media_id": "UUID",
      "artifact_ref": "opaque-string",
      "hash_algo": "sha256",
      "hash_hex": "<sha256>",
      "captured_at": "timestamp"
    }
  ],
  "notes": "...",
  "status": "completed",
  "attestations": {
    "geo_present": true,
    "device_present": true,
    "identity_present": true
  },
  "integrity": {
    "trust_snapshot_hash": "<sha256>",
    "chain_ref_hash": "<sha256>"
  }
}
`,
    closing:
      'This structure encodes the event, verifies integrity, enables customer-facing verification, and serves as the canonical source of truth.',
  },
  {
    title: '5. Hashing and Merkle Chain Architecture',
    subsections: [
      {
        subtitle: '5.1 Media Hashes',
        paragraphs: ['Each media object is hashed on upload: H1 = sha256(photo1)... Hn = sha256(median).'],
      },
      {
        subtitle: '5.2 Record Snapshot Hash',
        paragraphs: ['R = sha256(JSON.stringify(record_without_media)).'],
      },
      {
        subtitle: '5.3 Merkle Root',
        paragraphs: ['Media and record hashes form a Merkle tree: MR = MerkleRoot([H1, H2, ..., Hn, R]).'],
      },
      {
        subtitle: '5.4 Block Construction',
        paragraphs: [
          'Each batch of service records forms a block: BlockHash = sha256(MerkleRoot + PreviousBlockHash).',
          'This is a blockchain in the academic sense: chained, tamper-evident, append-only, auditable, and cryptographically linked.',
          'It avoids decentralized consensus, tokens, and public chain dependencies.',
        ],
      },
    ],
  },
  {
    title: '6. Backend Architecture',
    subsections: [
      {
        subtitle: '6.1 Components',
        bullets: [
          'Node/Express API',
          'PostgreSQL with trust-object tables',
          'Deterministic workflow orchestration',
          'S3-compatible object storage for media/evidence',
          'Internal hash chain + Merkle batching',
          'Automatic settlement engine',
          'Payment Resolution engine (method update/authentication/retry)',
          'Compatibility artifact generator (rare)',
        ],
      },
      {
        subtitle: '6.2 Workflow Overview',
        paragraphs: [
          'Job Completion Route: record creation, media association, metadata injection, trust snapshot creation, hashing.',
          'Trust Pipeline: leaf hash inserts, Merkle batching, block assembly.',
          'Payment Pipeline: pre-auth check, immediate settlement; if failure, Payment Resolution Mode; if externally required, compatibility artifact.',
        ],
        closing: 'This ensures tightly coupled truth and payment alignment.',
      },
    ],
  },
  {
    title: '7. Frontend Architecture',
    subsections: [
      {
        subtitle: '7.1 Worker Flow',
        bullets: ['Complete job', 'Add optional photos/notes', 'Submit', 'Receive confirmation: service verified, payment will settle automatically'],
      },
      {
        subtitle: '7.2 Customer Experience',
        bullets: [
          'Customers do not participate in invoicing. In the standard flow:',
          'They receive a “Service Completed + Proof” message',
          'They view photos/notes on a “Verified Service Record” page',
          'Their payment method is charged automatically',
          'If settlement requires action, the experience remains invoiceless: they see proof, authenticate/update method, and settlement completes immediately once resolved.',
        ],
      },
    ],
  },
  {
    title: '8. Operational Verification Layer',
    intro: 'The invoiceless model extends beyond verifying service completion. It verifies operational truth surrounding the service.',
    subsections: [
      {
        subtitle: '8.1 Tamper-Evident Workforce Events',
        paragraphs: [
          'Workforce events (clock-in/clock-out, job start/stop, route association) can be recorded as trust events with timestamps and integrity proofs. These may include additional attestations such as device and optional location context, producing tamper-evident evidence of when work occurred and how it aligns with expectations.',
          'This reduces administrative overhead and limits timecard manipulation by making labor records auditable.',
        ],
      },
      {
        subtitle: '8.2 Verified Job Start (Optional)',
        paragraphs: ['Arrival time, pre-service photos, and upstream conditions can form trust events linked to later completion.'],
      },
      {
        subtitle: '8.3 Device and Geo Attestation (Optional)',
        paragraphs: ['Records can optionally include device fingerprint, IP metadata, GPS or zone context, and other integrity signals to strengthen proof, without turning this into “crypto.”'],
      },
      {
        subtitle: '8.4 Labor Integrity',
        paragraphs: ['These events feed downstream operational intelligence: payroll validation, scheduling optimization, property visit audits, and compliance.'],
      },
    ],
  },
  {
    title: '9. Payment Orchestration Layer',
    intro: 'Payments are treated as a deterministic outcome of verified truth, not a customer interaction.',
    subsections: [
      {
        subtitle: '9.1 Pre-Authorized Settlement',
        paragraphs: ['The engine checks for pre-authorization and guarantees immediate settlement upon verification when the rail is ready.'],
      },
      {
        subtitle: '9.2 Automatic Source Failover',
        paragraphs: ['If the primary method fails, the system can attempt alternate stored methods according to policy.'],
      },
      {
        subtitle: '9.3 Smart Retry Logic',
        paragraphs: ['Retries are based on policy: customer history, job value, trust completeness, and rail failure type.'],
      },
      {
        subtitle: '9.4 Payment Resolution Mode Trigger',
        paragraphs: ['When action is needed (SCA/authentication, method update), the system triggers Payment Resolution Mode instead of an invoicing workflow.'],
      },
    ],
  },
  {
    title: '10. Economic Impact',
    tableHeaders: ['Metric', 'Traditional Invoice', 'Invoiceless Architecture'],
    tableRows: [
      ['Time-to-cash', '3-12 days', '0 days (rail-ready), near-0 with resolution'],
      ['AR Management', 'High', 'Near-zero (resolution, not invoicing)'],
      ['Failed Payments', 'Medium', 'Low (pre-auth + failover + resolution)'],
      ['Disputes', 'High', 'Low (proof-backed)'],
      ['Operational Overhead', 'High', 'Low'],
      ['Customer Satisfaction', 'Medium', 'High (no invoice friction)'],
    ],
    closing:
      'Across large operators, this translates into: 20-30% improvement in cash flow, 40-70% reduction in billing overhead, 50-80% reduction in disputes, 100% elimination of late payments.',
  },
  {
    title: '11. Risk Reduction',
    subsections: [
      {
        subtitle: '11.1 Disputes',
        paragraphs: ['A customer can dispute paperwork. Proof-backed records remove ambiguity around what occurred.'],
      },
      {
        subtitle: '11.2 Worker Compliance',
        paragraphs: ['Operational truth reduces fraud, time manipulation, and mismatch between expected and actual work.'],
      },
      {
        subtitle: '11.3 Customer Transparency',
        paragraphs: ['A proof page builds trust and reduces callbacks.'],
      },
    ],
  },
  {
    title: '12. Why This Is Not Crypto',
    paragraphs: [
      'This architecture uses hashing, not consensus. Uses chained integrity, not mining. Avoids tokens. Does not rely on blockchain networks. This is practical integrity, not speculative infrastructure.',
    ],
  },
  {
    title: '13. Extensions and Future Work',
    paragraphs: [
      'Future iterations may include: deeper payment-rail resolution, expanded verification signals, additional customer proof sharing controls, third-party verification portals, insurer integrations, warranty validation, and formalized chain-of-custody standards.',
    ],
  },
  {
    title: '14. Conclusion',
    paragraphs: [
      'Invoices exist because trust has historically been delegated to paperwork, and because billing has been separated from the moment truth is created. But when service events can be captured, verified, hashed, and settled deterministically, invoices stop being an operational requirement.',
      'Trust is earned at the moment of truth. Payment should follow immediately.',
      'The result is a better way for field services to operate: fast, modern, trust-driven, and fully automated.',
    ],
  },
];

function Section({ section }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_10px_40px_rgba(12,20,32,0.08)] text-neutral-900">
      <h3 className="text-xl font-semibold tracking-tight text-[#0f1922]">{section.title}</h3>
      {section.paragraphs?.map((p, idx) => (
        <p key={idx} className="mt-3 leading-relaxed text-neutral-700">
          {p}
        </p>
      ))}
      {section.intro && <p className="mt-3 leading-relaxed text-neutral-700">{section.intro}</p>}
      {section.bullets && (
        <ul className="mt-3 space-y-2 text-neutral-700 list-disc list-inside">
          {section.bullets.map((b, idx) => (
            <li key={idx}>{b}</li>
          ))}
        </ul>
      )}
      {section.code && (
        <pre className="mt-4 bg-neutral-900 text-amber-100 rounded-xl p-4 text-sm overflow-x-auto shadow-inner">
{section.code}
        </pre>
      )}
      {section.tableRows && (
        <div className="mt-4 border border-neutral-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-600 px-3 py-2">
            <div>{section.tableHeaders?.[0] || 'Metric'}</div>
            <div>{section.tableHeaders?.[1] || 'Traditional Invoice'}</div>
            <div>{section.tableHeaders?.[2] || 'Invoiceless Architecture'}</div>
          </div>
          {section.tableRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-3 px-3 py-3 text-sm border-t border-neutral-200">
              <div className="font-semibold text-neutral-800">{row[0]}</div>
              <div className="text-neutral-700">{row[1]}</div>
              <div className="text-neutral-900 font-medium">{row[2]}</div>
            </div>
          ))}
        </div>
      )}
      {section.subsections?.map((sub, idx) => (
        <div key={idx} className="mt-5 border-l-4 border-amber-400 pl-4">
          <h4 className="text-lg font-semibold text-[#0f1922]">{sub.subtitle}</h4>
          {sub.paragraphs?.map((p, pIdx) => (
            <p key={pIdx} className="mt-2 leading-relaxed text-neutral-700">
              {p}
            </p>
          ))}
          {sub.bullets && (
            <ul className="mt-2 space-y-2 text-neutral-700 list-disc list-inside">
              {sub.bullets.map((b, bIdx) => (
                <li key={bIdx}>{b}</li>
              ))}
            </ul>
          )}
          {sub.closing && <p className="mt-2 leading-relaxed text-neutral-700">{sub.closing}</p>}
        </div>
      ))}
      {Array.isArray(section.closing)
        ? section.closing.map((c, idx) => (
            <p key={idx} className="mt-3 leading-relaxed text-neutral-700">
              {c}
            </p>
          ))
        : section.closing
          ? <p className="mt-3 leading-relaxed text-neutral-700">{section.closing}</p>
          : null}
    </div>
  );
}

export default function WhitePaper() {
  const { user, roles = [], permissions = [], refreshMe, loginWithRedirect } = useAuth() || {};
  const isLocked = !user;

  useEffect(() => {
    document.title = 'The Invoiceless Architecture - PayHive White Paper';
  }, []);

  const unlock = async () => {
    try {
      await loginWithRedirect({
        appState: { returnTo: '/whitepaper' },
        authorizationParams: {
          screen_hint: 'login',
          prompt: 'login',
          redirect_uri: REDIRECT_URI,
          scope: 'openid profile email',
        },
      });
    } catch {
      // noop
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f9fc] to-[#eef2f7] text-[#0f1922]">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">White Paper</div>
              <h1 className="text-3xl font-bold tracking-tight">The Invoiceless Architecture</h1>
            </div>
          </div>
          {isLocked && (
            <button
              onClick={unlock}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow"
            >
              <Lock className="w-4 h-4" />
              Unlock to read
            </button>
          )}
        </div>

        <div className="space-y-4">
          {abstract.map((p, idx) => (
            <p key={idx} className="text-lg leading-relaxed text-neutral-800">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          {paperSections.map((section, idx) => (
            <Section key={idx} section={section} />
          ))}
        </div>
      </div>

      <div className="mt-12">
        <AppFooter />
      </div>
    </div>
  );
}
