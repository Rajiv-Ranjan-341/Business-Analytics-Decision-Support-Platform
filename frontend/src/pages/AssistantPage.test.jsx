import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssistantPage from './AssistantPage';
import * as client from '../api/client';

// The assistant's promise is that it never guesses. Every sentence is a fixed
// template with figures from the other pages dropped in, and a sentence whose
// figure is missing from the file is left out rather than filled with a zero or
// a placeholder. These tests hold it to that.

vi.mock('../api/client');

const DATASET = { id: 1, name: 'Superstore', row_count: 9994, column_count: 21 };

/** Only the KPIs are required; the other three calls are allowed to fail. */
function mockBackend({ kpis, products = null, diagnosis = null, mappings = {} }) {
  client.listDatasets.mockResolvedValue([DATASET]);
  client.getDashboardKpis.mockResolvedValue({ kpis });
  client.getProductProfitability.mockResolvedValue(products);
  client.getDiagnosis.mockResolvedValue(diagnosis);
  client.getColumnMappings.mockResolvedValue({ dataset_id: 1, mappings });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AssistantPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('the headline briefing', () => {
  it('reports what the file sold and kept', async () => {
    mockBackend({
      kpis: {
        total_revenue: 2_297_200.86,
        total_orders: 5009,
        total_profit: 286_397.02,
        profit_margin: 12.5,
      },
    });

    renderPage();

    expect(await screen.findByText(/This file sold/)).toBeInTheDocument();
    expect(screen.getByText('$2.30M')).toBeInTheDocument();
    expect(screen.getByText('5,009')).toBeInTheDocument();
    expect(screen.getByText(/You kept/)).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  // A shop owner says "you lost $1,811", not "you kept -$1,811". The sentence
  // carries the sign in its verb so the figure itself stays positive.
  it('says a negative profit as a loss, with the figure positive', async () => {
    mockBackend({
      kpis: { total_revenue: 11_099.96, total_profit: -8879.97 },
    });

    renderPage();

    expect(await screen.findByText(/You lost/)).toBeInTheDocument();
    expect(screen.getByText('$8.9K')).toBeInTheDocument();
    expect(screen.queryByText('-$8.9K')).not.toBeInTheDocument();
    expect(screen.queryByText(/You kept/)).not.toBeInTheDocument();
  });

  // The promise under test: omission, not invention.
  it('leaves out the sentences whose figures the file does not have', async () => {
    mockBackend({
      kpis: { total_revenue: 1000, total_profit: null, avg_order_value: null },
    });

    renderPage();

    expect(await screen.findByText(/This file sold/)).toBeInTheDocument();
    expect(screen.queryByText(/You kept/)).not.toBeInTheDocument();
    expect(screen.queryByText(/You lost/)).not.toBeInTheDocument();
    expect(screen.queryByText(/The average order is worth/)).not.toBeInTheDocument();
  });

  it('asks for the two column meanings it needs when it has none of them', async () => {
    mockBackend({ kpis: {} });

    renderPage();

    expect(await screen.findByText(/There is nothing to report yet/)).toBeInTheDocument();
  });
});

describe('what lost money', () => {
  it('ranks the losses worst first and points at the rest', async () => {
    mockBackend({
      kpis: { total_revenue: 1000 },
      products: {
        summary: { total_products: 1850, loss_making_products: 301 },
        products: [
          { product: 'Cubify CubeX 3D Printer', revenue: 11_099.96, profit: -8879.97, margin_pct: -80 },
          { product: 'Cisco TelePresence EX90', revenue: 22_638.48, profit: -1811.08, margin_pct: -8 },
          { product: 'Canon imageCLASS 2200', revenue: 61_599.82, profit: 25_199.93, margin_pct: 40.9 },
        ],
        tags: {},
      },
    });

    renderPage();

    expect(await screen.findByText(/products lost money/)).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1); // drop the header row
    expect(rows[0]).toHaveTextContent('Cubify CubeX 3D Printer');
    expect(rows[1]).toHaveTextContent('Cisco TelePresence EX90');

    // The profitable one is not a loss and does not belong in this table.
    expect(screen.queryByText('Canon imageCLASS 2200')).not.toBeInTheDocument();

    // The summary counts 301 losses across the whole file but this fixture
    // carries only 2 of them, so 299 are left for the products page. The panel
    // must count what it is actually showing, not assume it got all five.
    expect(screen.getByText('299')).toBeInTheDocument();
  });

  it('says so plainly when nothing lost money', async () => {
    mockBackend({
      kpis: { total_revenue: 1000 },
      products: {
        summary: { total_products: 1850, loss_making_products: 0 },
        products: [],
        tags: {},
      },
    });

    renderPage();

    expect(await screen.findByText(/Not one of your/)).toBeInTheDocument();
  });
});

describe('what moved against last month', () => {
  const diagnosis = {
    overview: {
      metric: 'Sales',
      current_month: '2017-12',
      previous_month: '2017-11',
      current_value: 95_000,
      previous_value: 118_000,
      absolute_change: -23_000,
      pct_change: -19.5,
    },
    top_contributors: [
      { dimension: 'Category', value: 'Technology', change: -15_000, contribution_pct: 65.2 },
    ],
  };

  it('names the largest mover and its share of the move', async () => {
    mockBackend({
      kpis: { total_revenue: 1000 },
      diagnosis,
      mappings: { revenue: 'Sales' },
    });

    renderPage();

    expect(await screen.findByText(/What you sold/)).toBeInTheDocument();
    expect(screen.getByText(/The single largest piece of that was/)).toBeInTheDocument();

    // Once in the sentence and once in the table below it. Both read the same
    // field, so both must print the same figure — a page that disagreed with
    // itself about a share would be worse than one that showed neither.
    expect(screen.getAllByText('65.2%')).toHaveLength(2);
  });

  // A share is this line's change over the total change. When the month's rises
  // and falls cancel exactly, that denominator is zero and no honest share
  // exists — so the page claims none rather than printing a figure.
  it('refuses to print a share when the move cancels to nothing', async () => {
    mockBackend({
      kpis: { total_revenue: 1000 },
      diagnosis: {
        overview: { ...diagnosis.overview, absolute_change: 0, pct_change: 0 },
        top_contributors: [
          { dimension: 'Category', value: 'Technology', change: -15_000, contribution_pct: 0 },
        ],
      },
      mappings: { revenue: 'Sales' },
    });

    renderPage();

    expect(await screen.findByText(/held level/)).toBeInTheDocument();
    expect(screen.queryByText('0.0%')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('when the backend refuses', () => {
  it('sends the reader to the one page that can fix it', async () => {
    client.listDatasets.mockResolvedValue([DATASET]);
    client.getDashboardKpis.mockRejectedValue({
      response: { data: { detail: 'No column is set as your sales figures.' } },
    });
    client.getProductProfitability.mockRejectedValue(new Error('no'));
    client.getDiagnosis.mockRejectedValue(new Error('no'));
    client.getColumnMappings.mockRejectedValue(new Error('no'));

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No column is set as your sales figures.');
    expect(screen.getByRole('link', { name: /Open your files/ })).toHaveAttribute('href', '/upload');
  });
});
