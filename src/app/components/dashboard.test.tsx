import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '@/app/components/dashboard';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

describe('Dashboard', () => {
  it('renderiza métricas del backend', async () => {
    vi.mocked(api.getDashboardMetrics).mockResolvedValue({
      active_workers: 12,
      events_today: 38,
      clocked_in_workers_count: 5,
      clocked_in_workers: [],
    });

    render(<Dashboard onNavigate={vi.fn()} onOpenWorkersFiltered={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
