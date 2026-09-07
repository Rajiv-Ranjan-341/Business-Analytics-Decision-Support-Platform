import PageHeader from '../components/Shared/PageHeader';

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        title="Product Profitability"
        description="Analyze products by revenue, profit, and margin."
      />
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-400 text-sm">Coming in Phase 3.</p>
      </div>
    </div>
  );
}
