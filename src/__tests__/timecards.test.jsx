import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { RunDetail } from '../pages/timecards/TimecardsHistory';
import { buildExportSchedulePayload } from '../pages/timecards/timecardUtils';

describe('Timecards role gating', () => {
  it('hides team totals for crew/self scope', () => {
    const run = {
      users: [
        { user_id: 1, name: 'Crew Member', team_name: 'A', job_minutes: 50, clocked_minutes: 60, billed_minutes: 55, variance_minutes: 5 },
        { user_id: 2, name: 'Other Member', team_name: 'B', job_minutes: 30, clocked_minutes: 40, billed_minutes: 35, variance_minutes: 5 },
      ],
      teams: [{ team_id: 9, team_name: 'All Crews', job_minutes: 200, clocked_minutes: 220, billed_minutes: 210, variance_minutes: -10 }],
    };

    render(<RunDetail run={run} scope="self" userId={1} onExport={() => {}} exporting={false} />);

    expect(screen.getByText('Crew Member')).toBeInTheDocument();
    expect(screen.queryByText(/Teams/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Other Member')).not.toBeInTheDocument();
  });
});

describe('Timecards export schedule payload', () => {
  it('builds payloads for weekly and custom schedules', () => {
    const weekly = buildExportSchedulePayload({
      timecard_export_frequency: 'weekly',
      timecard_export_weekdays: [2],
      timecard_export_timezone: 'UTC',
    });
    expect(weekly).toEqual({
      timecard_export_frequency: 'weekly',
      timecard_export_weekdays: [2],
      timecard_export_day_of_month: undefined,
      timecard_export_timezone: 'UTC',
    });

    const custom = buildExportSchedulePayload({
      timecard_export_frequency: 'custom_weekdays',
      timecard_export_weekdays: [1, 3, 5],
      timecard_export_timezone: '',
    });
    expect(custom).toEqual({
      timecard_export_frequency: 'custom_weekdays',
      timecard_export_weekdays: [1, 3, 5],
      timecard_export_day_of_month: undefined,
      timecard_export_timezone: undefined,
    });
  });
});

describe('Timecard run detail export control', () => {
  it('calls export handler when export button is clicked', async () => {
    const run = {
      id: 123,
      period_start: '2024-01-01',
      period_end: '2024-01-15',
      status: 'ready',
      generated_at: '2024-01-16T12:00:00Z',
      users: [{ user_id: 1, name: 'Crew Member', team_name: 'A', job_minutes: 10, clocked_minutes: 12, billed_minutes: 10, variance_minutes: 2 }],
      teams: [],
    };
    const onExport = jest.fn();
    render(<RunDetail run={run} scope="owner" userId={1} onExport={onExport} exporting={false} />);

    const btn = screen.getByRole('button', { name: /export csv/i });
    await userEvent.click(btn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
