import React from 'react';

const UsersHeader = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className="mb-4 mt-8">
      <h3 className="text-lg font-semibold mb-2">Users</h3>
      <input
        type="text"
        placeholder="Search by email or name"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border px-3 py-2 w-full rounded"
      />
    </div>
  );
};

export default UsersHeader;
