import React from 'react';
import { User, Phone, Mail, MapPin, Building2 } from 'lucide-react';

const STAGES = ['prospect', 'qualified', 'proposal', 'negotiation', 'customer', 'churned'];

const stageColors = {
  prospect: 'border-t-gray-400',
  qualified: 'border-t-blue-400',
  proposal: 'border-t-purple-400',
  negotiation: 'border-t-amber-400',
  customer: 'border-t-green-400',
  churned: 'border-t-red-400',
};

const stageLabels = {
  prospect: 'Prospect',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  customer: 'Customer',
  churned: 'Churned',
};

export default function KanbanBoard({ items, onUpdateStage, onCardClick, loading }) {
  const columns = STAGES.map((stage) => ({
    stage,
    items: items.filter((item) => (item.stage || 'prospect') === stage),
  }));

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    const itemId = parseInt(e.dataTransfer.getData('itemId'));
    const itemType = e.dataTransfer.getData('itemType') || 'contact';
    if (itemId) {
      onUpdateStage(itemId, targetStage, itemType);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(({ stage, items: stageItems }) => (
        <div
          key={stage}
          className="flex-shrink-0 w-72"
          onDrop={(e) => handleDrop(e, stage)}
          onDragOver={handleDragOver}
        >
          <div className={`bg-white rounded-lg border border-t-4 ${stageColors[stage]} shadow-sm`}>
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{stageLabels[stage] || stage}</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {stageItems.length}
                </span>
              </div>
            </div>
            <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
              {stageItems.map((item) => (
                <KanbanCard key={`${item._type || 'contact'}-${item.id}`} item={item} onClick={() => onCardClick(item)} />
              ))}
              {stageItems.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No items
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ item, onClick }) {
  const isOrg = item._type === 'organization';

  const handleDragStart = (e) => {
    e.dataTransfer.setData('itemId', item.id.toString());
    e.dataTransfer.setData('itemType', item._type || 'contact');
  };

  const displayName = isOrg
    ? (item.name || 'Unknown')
    : ([item.first_name, item.last_name].filter(Boolean).join(' ') || item.name || 'Unknown');

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOrg ? 'bg-blue-100' : 'bg-gray-100'}`}>
          {isOrg ? <Building2 className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {displayName}
          </div>
          {isOrg && item.industry && (
            <div className="text-xs text-gray-400 truncate">{item.industry}</div>
          )}
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {item.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Mail className="h-3 w-3" />
            <span className="truncate">{item.email}</span>
          </div>
        )}
        {!item.email && isOrg && item.website && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{item.website}</span>
          </div>
        )}
        {item.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Phone className="h-3 w-3" />
            <span className="truncate">{item.phone}</span>
          </div>
        )}
        {item.city && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{[item.city, item.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
      </div>
      {(item.source || isOrg) && (
        <div className="mt-2 pt-2 border-t flex items-center gap-1.5">
          {item.source && (
            <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
              {item.source}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${isOrg ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOrg ? 'Org' : 'Contact'}
          </span>
        </div>
      )}
    </div>
  );
}
