import PageHeader from '../components/Shared/PageHeader';

export default function AssistantPage() {
  return (
    <div>
      <PageHeader
        title="AI Business Assistant"
        description="Ask questions about your business data and get AI-powered insights."
      />
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-400 text-sm">Coming in Phase 4.</p>
      </div>
    </div>
  );
}
