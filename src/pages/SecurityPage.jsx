// src/pages/SecurityPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Eye,
  Server,
  CheckCircle,
  FileText,
  Clock,
  Users,
  ArrowLeft,
} from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="text-white py-16" style={{ backgroundColor: '#2e2e2e' }}>
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-12 h-12 text-amber-500" />
            <h1 className="text-4xl font-bold">Security at PayHive</h1>
          </div>
          <p className="text-xl text-gray-300">
            Your security is our top priority. Learn about the measures we take to protect your data.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Overview */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Our Security Commitment</h2>
          <p className="text-gray-600 mb-4">
            PayHive is built with security at its core. We employ industry-leading practices and
            technologies to ensure your business and customer data remains protected at all times.
          </p>
          <p className="text-gray-600">
            We continuously monitor, test, and improve our security posture to stay ahead of
            emerging threats and maintain the trust you place in us.
          </p>
        </section>

        {/* Security Features Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Security Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <SecurityCard
              icon={Lock}
              title="End-to-End Encryption"
              description="All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Payment data is tokenized and never stored in plain text."
            />
            <SecurityCard
              icon={Shield}
              title="FIDO2 Passwordless Auth"
              description="Support for modern passwordless authentication using hardware security keys and biometrics, eliminating password-based vulnerabilities."
            />
            <SecurityCard
              icon={Eye}
              title="24/7 Security Monitoring"
              description="Automated threat detection and monitoring systems watch for suspicious activity around the clock, with immediate alerting for any anomalies."
            />
            <SecurityCard
              icon={Server}
              title="Secure Infrastructure"
              description="Hosted on SOC 2 compliant infrastructure with redundant systems, automatic failover, and geographic distribution for high availability."
            />
            <SecurityCard
              icon={Clock}
              title="Regular Security Audits"
              description="Weekly automated security testing and periodic third-party penetration tests ensure our defenses remain strong against evolving threats."
            />
            <SecurityCard
              icon={Users}
              title="Role-Based Access Control"
              description="Granular permissions system ensures users only access the data and features they need, following the principle of least privilege."
            />
          </div>
        </section>

        {/* Compliance */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Compliance & Standards</h2>
          <div className="bg-gray-50 rounded-xl p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <ComplianceItem title="PCI DSS Compliant" description="Payment processing meets Payment Card Industry Data Security Standards" />
              <ComplianceItem title="SOC 2 Type II" description="Infrastructure adheres to SOC 2 security and availability principles" />
              <ComplianceItem title="GDPR Ready" description="Data handling practices comply with European privacy regulations" />
              <ComplianceItem title="99.9% Uptime SLA" description="Service level agreement with guaranteed availability" />
            </div>
          </div>
        </section>

        {/* Data Protection */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Data Protection</h2>
          <div className="space-y-4">
            <ProtectionItem
              title="Daily Backups"
              description="Automated daily backups with 30-day retention and point-in-time recovery capabilities."
            />
            <ProtectionItem
              title="7-Year Audit Logs"
              description="Comprehensive audit trail of all system access and changes retained for compliance and forensics."
            />
            <ProtectionItem
              title="Data Isolation"
              description="Multi-tenant architecture with strict data isolation ensures your data is never accessible to other customers."
            />
            <ProtectionItem
              title="Secure Data Centers"
              description="Physical security including biometric access, 24/7 surveillance, and environmental controls."
            />
          </div>
        </section>

        {/* Incident Response */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Incident Response</h2>
          <p className="text-gray-600 mb-4">
            In the unlikely event of a security incident, our dedicated security team follows a
            well-defined incident response plan to quickly contain, investigate, and remediate any issues.
          </p>
          <p className="text-gray-600">
            We commit to transparent communication with affected customers and regulatory bodies
            as required, with timely notifications and detailed post-incident reports.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-amber-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Security Questions?</h2>
          <p className="text-gray-600 mb-6">
            If you have questions about our security practices or want to report a security concern,
            please reach out to our security team.
          </p>
          <a
            href="mailto:security@payhive.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Contact Security Team
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} PayHive. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link to="/terms" className="hover:text-gray-900">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
            <Link to="/" className="hover:text-gray-900">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SecurityCard({ icon: Icon, title, description }) {
  return (
    <div className="border rounded-xl p-6 hover:shadow-md transition-shadow">
      <Icon className="w-8 h-8 text-amber-500 mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function ComplianceItem({ title, description }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </div>
  );
}

function ProtectionItem({ title, description }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
      <CheckCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </div>
  );
}
