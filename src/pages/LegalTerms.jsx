import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';

export default function LegalTerms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) govern your access to and use of PayHive’s website
        and services. By accessing or using the service, you agree to these Terms.
        If you use the service on behalf of a company, you represent that you are authorized
        to bind that company, and “you” refers to that company.
      </p>

      <h2>1. Eligibility &amp; Accounts</h2>
      <ul>
        <li>You must be at least 18 and able to form a binding contract.</li>
        <li>
          Registration and login are handled by our authentication provider. Keep your credentials secure and
          notify us immediately of any unauthorized use. You are responsible for activities
          under your account, including actions by users you invite.
        </li>
        <li>
          You must provide accurate, current information and keep it updated (e.g., company
          name, billing contact).
        </li>
      </ul>

      <h2>2. Your Data &amp; Content</h2>
      <p>
        As between you and us, you own all data and content you submit to the service
        (e.g., customers, properties, schedules, invoices, attachments, messages).
        You grant us a worldwide, non-exclusive, royalty-free license to host, process,
        transmit, display, and create limited backups of your content as reasonably
        necessary to provide and support the service, and to create <strong>aggregated or
        de-identified data</strong> that does not identify you or your users, which we may use
        to improve and operate the service.
      </p>
      <p>
        You are responsible for your content, including ensuring that you have all rights
        and lawful bases required to store, use, and share it through the service.
      </p>

      <h2>3. Acceptable Use</h2>
      <ul>
        <li>Comply with all laws, including anti-spam/telemarketing rules (CAN-SPAM, CASL, TCPA).</li>
        <li>No unlawful, infringing, deceptive, harassing, or harmful content or activity.</li>
        <li>No reverse engineering, scraping, rate-limiting evasion, or unauthorized access.</li>
        <li>No uploading payment card primary account numbers (PANs) or bank account numbers outside Stripe.</li>
        <li>No storing or processing protected health information (PHI) or other highly sensitive data.</li>
        <li>No attempts to interfere with or disrupt the service or its security.</li>
      </ul>
      <p>
        <strong>Invites and messaging:</strong> If you import contacts or send QR/email/SMS invites through
        PayHive, you must have a lawful basis to contact recipients and must comply with applicable consent
        and content rules. You are solely responsible for the messages you send.
      </p>

      <h2>4. Roles, Permissions &amp; Visibility</h2>
      <p>
        You control roles (Owner/Admin/Manager/Crew) and visibility settings in your organization.
        You are responsible for granting and revoking access appropriately and reviewing activity.
        We are not responsible for misconfigurations or unauthorized disclosures caused by your settings.
      </p>

      <h2>5. Payments, Fees &amp; Taxes</h2>
      <p>
        <strong>Platform fees:</strong> We may offer free trials. After a trial, paid plans, usage charges, and
        add-on fees (if any) will be billed as described at sign-up or in your order. Fees are due upon
        invoice and are non-refundable unless required by law. You are responsible for all applicable taxes.
      </p>
      <p>
        <strong>Stripe processing:</strong> Customer payments are processed by Stripe. Your use of payment features
        is subject to Stripe’s terms, and you may be required to complete KYC or other verification. Chargebacks,
        disputes, and risk decisions are between you, your customers, and Stripe. We are not a party to card
        transactions, do not control settlement timelines, and do not store full card numbers.
      </p>

      <h2>6. Third-Party Services</h2>
      <p>
        The service integrates with third parties (e.g., authentication provider, Stripe, email/SMS providers).
        You may also optionally connect PayHive to accounting software (such as QuickBooks), productivity tools
        (such as Outlook), or other third-party services. By enabling these integrations, you authorize us to
        share relevant data (e.g., invoices, customer information, payment records) with those services.
        Their terms and privacy policies govern your use of those services. We are not responsible
        for third-party services and do not control their availability or performance.
      </p>

      <h2>7. Confidentiality</h2>
      <p>
        Each party may receive confidential information of the other. The receiving party will use the
        same degree of care it uses to protect its own similar information (but no less than reasonable care)
        and will use it only to perform under these Terms.
      </p>

      <h2>8. Security &amp; Data Protection</h2>
      <p>
        We implement safeguards appropriate to the nature of the data and our service (see our{' '}
        <Link to="/legal/privacy">Privacy Policy</Link>). When we process personal data on your behalf,
        our role is processor/service provider. A data processing addendum (DPA) is available upon request.
      </p>

      <h2>9. Service Changes; Beta</h2>
      <p>
        We may modify or discontinue features with reasonable notice where practicable. From time to time,
        we may offer beta or preview features; they are provided “as is,” may be withdrawn, and may be subject
        to additional terms.
      </p>

      <h2>10. Term; Suspension; Termination</h2>
      <ul>
        <li>
          These Terms begin when you first use the service and continue until terminated. Either party
          may terminate for convenience by closing the account or with written notice as stated in your order.
        </li>
        <li>
          We may suspend or terminate access for violation of these Terms, legal requirements, risk, or harm
          to the service. We will make reasonable efforts to notify you when practicable.
        </li>
        <li>
          Upon termination, your access ends. We may retain limited data as required by law or for legitimate
          business purposes (e.g., transaction records). You can request exports of your data prior to closure.
        </li>
      </ul>

      <h2>11. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW,
        WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE OPERATION.
      </p>

      <h2>12. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, GOODWILL,
        OR DATA, EVEN IF ADVISED OF THE POSSIBILITY. EXCEPT FOR YOUR PAYMENT OBLIGATIONS, YOUR INDEMNITY,
        OR A PARTY’S BREACH OF CONFIDENTIALITY OR INFRINGEMENT OF THE OTHER PARTY’S INTELLECTUAL PROPERTY,
        EACH PARTY’S TOTAL LIABILITY UNDER THESE TERMS IS LIMITED TO THE AMOUNTS PAID OR PAYABLE BY YOU TO US
        FOR THE SERVICE IN THE <strong>TWELVE (12) MONTHS</strong> BEFORE THE EVENT GIVING RISE TO LIABILITY.
      </p>

      <h2>13. Indemnification</h2>
      <p>
        You will defend, indemnify, and hold us harmless from claims, damages, liabilities, costs, and expenses
        (including reasonable attorneys’ fees) arising out of: (a) your content or use of the service in
        violation of law or these Terms; (b) communications you send (e.g., SMS/email invites) without proper
        consent; or (c) your violation of third-party rights.
      </p>

      <h2>14. Governing Law; Venue</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware and applicable U.S. federal law, without
        regard to conflict-of-laws rules. The exclusive forum for disputes will be the state and federal courts
        located in Wilmington, Delaware, and each party consents to personal jurisdiction there.
      </p>

      <h2>15. Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. If changes are material, we will provide reasonable notice.
        Your continued use after the effective date constitutes acceptance of the updated Terms.
      </p>

      <h2>16. Miscellaneous</h2>
      <ul>
        <li>
          <strong>Entire Agreement.</strong> These Terms (and any applicable order) are the entire agreement
          between you and us regarding the service.
        </li>
        <li>
          <strong>Assignment.</strong> You may not assign these Terms without our prior written consent; we may
          assign to an affiliate or in connection with a corporate transaction.
        </li>
        <li>
          <strong>Severability; Waiver.</strong> If any provision is unenforceable, the remainder remains in effect.
          Failure to enforce a provision is not a waiver.
        </li>
        <li>
          <strong>Notices.</strong> We may send notices to your account email; you may send notices to{' '}
          <a className="underline" href="mailto:support@thepayhive.com">support@thepayhive.com</a>.
        </li>
      </ul>

      <p>
        See our <Link className="underline" to="/legal/privacy">Privacy Policy</Link> for how we handle personal information.
      </p>
    </LegalLayout>
  );
}
