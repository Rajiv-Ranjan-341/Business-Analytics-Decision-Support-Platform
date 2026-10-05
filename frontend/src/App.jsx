import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import DashboardLayout from './components/Layout/DashboardLayout';
import LandingPage from './pages/LandingPage';
import LoadingSpinner from './components/Shared/LoadingSpinner';

// The landing page and the layout shell are imported eagerly: they are the
// first thing a visitor sees, and splitting them would only add a round trip
// before anything paints.
//
// Every page behind the shell is loaded on demand. Six of them draw charts, so
// they each pull in Recharts — far and away the heaviest thing in this project.
// Bundled together that pushed the single entry chunk past 800 kB, which a shop
// owner on a slow connection pays for before reading one word. Split this way,
// the chart library only arrives when someone actually opens a page with a
// chart on it.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ForecastPage = lazy(() => import('./pages/ForecastPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<DashboardLayout />}>
          {/* Inside the layout, so the sidebar stays put while a page arrives
              and the spinner lands where the page will. */}
          <Route
            element={
              <Suspense fallback={<LoadingSpinner message="Opening the page" />}>
                <Outlet />
              </Suspense>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/diagnosis" element={<DiagnosisPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/summary" element={<SummaryPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
