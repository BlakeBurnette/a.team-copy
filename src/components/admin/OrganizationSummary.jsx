import React from 'react';

const OrganizationSummary = ({ orgSummary, orgEdits, queueOrgEdit }) => {
  const MobileCards = () => (
    <div className="md:hidden space-y-3">
      {orgSummary.map((org) => (
        <div key={org.id} className="border rounded-lg p-3 shadow-sm bg-white">
          <div className="text-xs text-gray-600 mb-1">Name</div>
          <input
            type="text"
            value={(orgEdits[org.id]?.name) ?? org.name}
            onChange={(e) => queueOrgEdit(org.id, 'name', e.target.value)}
            className="border p-2 w-full text-sm"
          />
          <div className="text-xs text-gray-600 mt-3">Member Count</div>
          <div className="text-base">{org.member_count}</div>
        </div>
      ))}
    </div>
  );

  const DesktopTable = () => (
    <div className="hidden md:block overflow-x-auto">
      <table className="min-w-[520px] w-full border-collapse border border-gray-300 text-sm bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2 text-left">Name</th>
            <th className="border border-gray-300 p-2 text-left">Member Count</th>
          </tr>
        </thead>
        <tbody>
          {orgSummary.map((org) => (
            <tr key={org.id}>
              <td className="border border-gray-300 p-2">
                <input
                  type="text"
                  value={(orgEdits[org.id]?.name) ?? org.name}
                  onChange={(e) => queueOrgEdit(org.id, 'name', e.target.value)}
                  className="border p-2 w-full"
                />
              </td>
              <td className="border border-gray-300 p-2">{org.member_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold mb-2">Organizations (Summary)</h3>
      <MobileCards />
      <DesktopTable />
    </div>
  );
};

export default OrganizationSummary;
