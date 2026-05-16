import React, { useState } from 'react';
import { Phone, Mail, Send, MessageSquare, CheckCircle2, Clock, Sparkles, X } from 'lucide-react';

const USE_MOCK = true;

const MOCK_DRAFTS = [
  {
    id: 'd1',
    type: 'payment_reminder',
    channel: 'sms',
    reason: 'Balance overdue 12 days',
    body: 'Hi {name}, just a friendly reminder — you have an outstanding balance of $185.00. Reply PAID once sent, or let me know if you need to set up a plan.',
    priority: 'high',
  },
  {
    id: 'd2',
    type: 'seasonal_upsell',
    channel: 'email',
    reason: 'Spring aeration — not yet scheduled',
    subject: 'Time for spring aeration?',
    body: "Hi {name},\n\nSpring is here and it's the perfect time for lawn aeration. We're offering 15% off for existing customers this month.\n\nWould you like me to add it to your next visit?",
    priority: 'medium',
  },
  {
    id: 'd3',
    type: 'follow_up',
    channel: 'sms',
    reason: 'Service completed 3 days ago, no feedback',
    body: 'Hi {name}, just checking in — how did everything look after our visit on Monday? Let us know if anything needs attention.',
    priority: 'low',
  },
];

const MOCK_MESSAGES = [
  { id: 'm1', channel: 'sms', direction: 'outbound', body: 'Hi Sarah, your lawn service is confirmed for tomorrow 8am-12pm.', sent_at: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'delivered' },
  { id: 'm2', channel: 'sms', direction: 'inbound', body: 'Great, thank you!', sent_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString() },
  { id: 'm3', channel: 'email', direction: 'outbound', subject: 'Invoice #234', body: 'Hi Sarah, please find your invoice attached...', sent_at: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'delivered' },
  { id: 'm4', channel: 'sms', direction: 'outbound', body: 'Payment of $85.00 received. Thank you!', sent_at: new Date(Date.now() - 5 * 86400000 + 7200000).toISOString(), status: 'delivered' },
];

function PriorityDot({ priority }) {
  const colors = {
    high: 'bg-red-500',
    medium: 'bg-amber-400',
    low: 'bg-green-500',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[priority] || 'bg-neutral-300'}`} />;
}

function ChannelIcon({ channel, className = 'h-4 w-4' }) {
  return channel === 'sms'
    ? <Phone className={className} />
    : <Mail className={className} />;
}

function DraftCard({ draft, customerName, onApprove, onEdit, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const body = draft.body.replace('{name}', customerName || 'there');
  const truncated = body.length > 120 && !expanded;

  return (
    <div className="p-4 rounded-lg bg-white border border-neutral-200 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChannelIcon channel={draft.channel} className="h-4 w-4 text-neutral-500" />
          <span className="text-xs font-medium text-neutral-500 uppercase">
            {draft.channel}
          </span>
          <PriorityDot priority={draft.priority} />
        </div>
        <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
          {draft.reason}
        </span>
      </div>

      {/* Subject (email only) */}
      {draft.subject && (
        <div className="text-sm font-semibold text-neutral-700">
          {draft.subject}
        </div>
      )}

      {/* Body */}
      <div
        className="text-sm text-neutral-600 whitespace-pre-wrap cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {truncated ? body.slice(0, 120) + '...' : body}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onApprove(draft.id)}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          Approve & Send
        </button>
        <button
          onClick={() => onEdit(draft)}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDismiss(draft.id)}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isOutbound = message.direction === 'outbound';
  const time = new Date(message.sent_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] space-y-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm ${
            isOutbound
              ? 'bg-amber-50 border border-amber-200 text-neutral-800'
              : 'bg-neutral-100 border border-neutral-200 text-neutral-700'
          }`}
        >
          {message.subject && (
            <div className="font-semibold text-xs text-neutral-500 mb-1">{message.subject}</div>
          )}
          {message.body}
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] text-neutral-400 ${isOutbound ? 'justify-end' : ''}`}>
          <ChannelIcon channel={message.channel} className="h-3 w-3" />
          <span>{time}</span>
          {isOutbound && message.status === 'delivered' && (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          )}
          {isOutbound && message.status === 'pending' && (
            <Clock className="h-3 w-3 text-amber-400" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesTab({ customerId, customerName }) {
  const [drafts, setDrafts] = useState(USE_MOCK ? MOCK_DRAFTS : []);
  const [messages] = useState(USE_MOCK ? MOCK_MESSAGES : []);
  const [composeChannel, setComposeChannel] = useState('sms');
  const [composeText, setComposeText] = useState('');
  const [composeSubject, setComposeSubject] = useState('');

  const handleApprove = (draftId) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    // TODO: POST to API
  };

  const handleEdit = (draft) => {
    setComposeChannel(draft.channel);
    setComposeText(draft.body.replace('{name}', customerName || 'there'));
    if (draft.subject) setComposeSubject(draft.subject);
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
  };

  const handleDismiss = (draftId) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  const handleSend = () => {
    if (!composeText.trim()) return;
    // TODO: POST to API
    setComposeText('');
    setComposeSubject('');
  };

  const handleAskSirWalter = () => {
    // TODO: POST to drafts endpoint
    setComposeText(`Hi ${customerName || 'there'}, `);
  };

  return (
    <div className="space-y-6">
      {/* Sir Walter Draft Queue */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-neutral-700">Sir Walter Draft Queue</h3>
            <span className="text-xs text-neutral-400">({drafts.length})</span>
          </div>
          <div className="space-y-3">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                customerName={customerName}
                onApprove={handleApprove}
                onEdit={handleEdit}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Message History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-700">Message History</h3>
        </div>
        <div className="space-y-3 p-4 rounded-lg bg-neutral-50 border border-neutral-200 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">No messages yet.</p>
          ) : (
            messages
              .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at))
              .map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
        </div>
      </div>

      {/* Compose Area */}
      <div className="p-4 rounded-lg bg-white border border-neutral-200 space-y-3">
        {/* Channel toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setComposeChannel('sms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              composeChannel === 'sms'
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            SMS
          </button>
          <button
            onClick={() => setComposeChannel('email')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              composeChannel === 'email'
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
        </div>

        {/* Subject (email only) */}
        {composeChannel === 'email' && (
          <input
            type="text"
            placeholder="Subject"
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        )}

        {/* Message input */}
        <textarea
          placeholder={`Type a ${composeChannel === 'sms' ? 'message' : 'email'}...`}
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
          rows={composeChannel === 'email' ? 4 : 2}
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
        />

        {/* Send + Sir Walter */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleAskSirWalter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask Sir Walter to draft
          </button>
          <button
            onClick={handleSend}
            disabled={!composeText.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
