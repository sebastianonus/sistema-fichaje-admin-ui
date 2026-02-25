import { render, screen, waitFor } from '@testing-library/react';
import { Trabajadores } from '@/app/components/trabajadores';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

describe('Trabajadores', () => {
  it('muestra empty state cuando no hay trabajadores', async () => {
    vi.mocked(api.getWorkers).mockResolvedValue([]);

    render(<Trabajadores />);

    await waitFor(() => {
      expect(screen.getByText(/No hay trabajadores/i)).toBeInTheDocument();
    });
  });
});

