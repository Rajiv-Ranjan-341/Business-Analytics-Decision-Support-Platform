import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-paper text-ink print:block print:min-h-0 print:bg-white">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-8 py-8 print:max-w-none print:p-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
