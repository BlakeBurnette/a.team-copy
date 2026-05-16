import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';

export default function LegalPrivacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how PayHive (“we,” “our,” or “us”) collects, uses,
        discloses, and safeguards information in connection with our website and services,
        including customer onboarding (QR/email/SMS invites), scheduling and crew management,
        invoicing, and payment processing integrations.
      </p>

      <h2>Scope &amp; Roles</h2>
      <p>
        We act as a <strong>controller</strong> for the data we collect about you when you visit our
        sites, sign up for a trial, or otherwise interact with us directly. When business
        customers use PayHive to process their own customers’ data (e.g., property addresses,
        job details, invoices), we generally act as a <strong>processor/service provider</strong> on
        their behalf. If you are a customer of a business that uses PayHive, please contact
        that business to exercise your privacy rights; we will assist them as required.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>
          <strong>Account &amp; lead data:</strong> name, email, company, phone, and preferences you
          submit via our forms (e.g., demo or trial requests). Authentication is provided via
          our login provider; we receive your basic profile and identifiers.
        </li>
        <li>
          <strong>Business &amp; customer content:</strong> customers you import, invited recipients,
          property addresses, services, schedules, crew assignments, notes, and attachments.
        </li>
        <li>
          <strong>Payment-related info:</strong> we integrate with Stripe to process payments. We do
          not store full card numbers. We may receive limited payment metadata (e.g., last4, brand,
          status, amounts) necessary for invoices, reconciliation, and support.
        </li>
        <li>
          <strong>Device &amp; usage data:</strong> IP address, browser/user-agent, pages viewed, referring
          URLs, approximate location (derived from IP), timestamps, error and performance logs, and
          product interaction events (e.g., clicks or settings changes).
        </li>
        <li>
          <strong>Cookies &amp; similar tech:</strong> to keep you logged in, remember preferences, measure
          usage, and improve features. You can control cookies through your browser settings.
        </li>
        <li>
          <strong>From service providers:</strong> identity assertions from our authentication provider, payment and risk
          signals from Stripe, and operational data from hosting, email/SMS, logging, and analytics
          providers.
        </li>
      </ul>

      <h2>How We Use Information</h2>
      <ul>
        <li>Provide, secure, and maintain the service (authentication, sessions, access control).</li>
        <li>
          Operate core workflows: onboarding (QR/email/SMS invites), customer management,
          scheduling/crew assignment, invoicing, and payment status reconciliation.
        </li>
        <li>Communicate with you about the service (support, updates, billing, and security notices).</li>
        <li>Improve and develop features, including troubleshooting, analytics, and research.</li>
        <li>
          Send marketing communications with your consent or as otherwise permitted (you may opt out at any
          time). Transactional emails (e.g., receipts, alerts) are required to provide the service.
        </li>
        <li>Comply with legal obligations and enforce our <Link to="/legal/terms">Terms</Link>.</li>
      </ul>

      <h2>Disclosure of Information</h2>
      <p>We disclose information as follows:</p>
      <ul>
        <li>
          <strong>Service providers:</strong> hosting, authentication provider, payments (Stripe), email/SMS
          delivery, customer support, analytics, logging/monitoring, and security vendors. They may access
          information only to perform services for us and must protect it.
        </li>
        <li>
          <strong>Third-party integrations:</strong> if you connect PayHive to third-party services such as
          QuickBooks, Outlook, or other accounting or productivity tools, we will share data necessary to
          enable the integration (e.g., invoices, customer names, payment records). These integrations are
          optional and initiated by you. Your use of third-party services is governed by their respective
          privacy policies and terms.
        </li>
        <li>
          <strong>Within your organization:</strong> data visible to your team depends on roles/permissions
          you configure (e.g., crew assignments, schedules, invoices).
        </li>
        <li>
          <strong>Legal and safety:</strong> to comply with law, enforce agreements, or protect rights, safety,
          and the integrity of the service.
        </li>
        <li>
          <strong>Business transfers:</strong> in connection with a merger, acquisition, financing, or sale of
          assets, subject to appropriate safeguards.
        </li>
        <li><strong>With your direction or consent.</strong></li>
      </ul>

      <h2>How Disclosures Occur</h2>
      <p>
        Disclosures occur through secure, access-controlled means (e.g., API calls, least-privilege console
        access) and are limited to what is reasonably necessary to perform the relevant function.
      </p>

      <h2>Security</h2>
      <ul>
        <li>TLS for data in transit and encryption at rest where applicable.</li>
        <li>Role-based access controls, audit logging, and least-privilege practices.</li>
        <li>Vulnerability management, dependency updates, and security monitoring.</li>
      </ul>
      <p>
        No method of transmission or storage is 100% secure. We maintain safeguards appropriate to the
        nature of the data and the risks of our service.
      </p>

      <h2>Retention</h2>
      <p>
        We retain information while your account is active or as needed to provide the service, resolve
        disputes, and comply with legal obligations (for example, certain invoice/transaction records may
        be retained for up to seven years). Backups and logs are retained for limited periods and then
        deleted or de-identified.
      </p>

      <h2>Your Choices &amp; Rights</h2>
      <ul>
        <li>Access, correct, or delete account information via in-product settings or by contacting us.</li>
        <li>Export certain data where technically feasible.</li>
        <li>Opt out of marketing emails using the unsubscribe link; we will still send essential notices.</li>
        <li>Control cookies via browser settings (blocking some cookies may affect functionality).</li>
      </ul>

      <h3>EEA/UK Visitors</h3>
      <p>
        If you are in the EEA/UK, our legal bases include contract performance, legitimate interests (e.g.,
        securing and improving the service), consent (where applicable), and compliance with legal obligations.
        You may have rights to access, correct, delete, restrict, or object to processing, and to portability.
        Contact us to exercise these rights; if we process on a customer’s behalf, we will direct you to them.
      </p>

      <h3>California Residents</h3>
      <p>
        We process “personal information” as defined by the CPRA. We do <strong>not</strong> “sell” or “share”
        personal information (as those terms are defined by CPRA). You may request access, deletion, and
        correction, and you have a right to non-discrimination for exercising your rights. Authorized agents
        may submit requests with proper documentation.
      </p>

      <h2>Invites &amp; Communications You Initiate</h2>
      <p>
        If you import contacts or send QR/email/SMS invites through PayHive, you are responsible for ensuring
        you have a lawful basis to contact those recipients (e.g., consent) and for complying with applicable
        anti-spam and telemarketing laws (e.g., CAN-SPAM, CASL, TCPA). We process those communications as your
        service provider.
      </p>

      <h2>Children</h2>
      <p>
        Our service is for businesses and is not directed to children under 16. We do not knowingly collect
        personal information from children under 16.
      </p>

      <h2>International Transfers</h2>
      <p>
        We are a U.S.-based service and may transfer information to the United States and other countries
        where our service providers operate. When required, we use appropriate safeguards such as Standard
        Contractual Clauses.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. If changes are material, we will provide
        appropriate notice. Your continued use after the effective date means you accept the changes.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests? Email <a className="underline" href="mailto:support@thepayhive.com">support@thepayhive.com</a>.
      </p>

      <p>
        See our <Link className="underline" to="/legal/terms">Terms of Service</Link> for more on your responsibilities and acceptable use.
      </p>
    </LegalLayout>
  );
}
