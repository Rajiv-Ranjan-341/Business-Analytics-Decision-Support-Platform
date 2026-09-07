import PageHeader from '../components/Shared/PageHeader';

export default function SimulatorPage() {
  return (
    <div>
      <PageHeader
        title="What-If Simulator"
        description="Simulate business scenarios and see predicted outcomes."
      />
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-400 text-sm">Coming in Phase 3.</p>
      </div>
    </div>
  );
}
