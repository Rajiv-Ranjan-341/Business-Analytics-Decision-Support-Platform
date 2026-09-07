import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/Layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ForecastPage from './pages/ForecastPage';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import DiagnosisPage from './pages/DiagnosisPage';
import SimulatorPage from './pages/SimulatorPage';
import AssistantPage from './pages/AssistantPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
