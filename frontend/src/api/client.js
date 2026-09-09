import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function listDatasets() {
  const res = await api.get('/datasets/');
  return res.data;
}

export async function getDatasetDetail(id) {
  const res = await api.get(`/datasets/${id}`);
  return res.data;
}

export async function deleteDataset(id) {
  const res = await api.delete(`/datasets/${id}`);
  return res.data;
}

export async function getColumnSuggestions(id) {
  const res = await api.get(`/datasets/${id}/suggestions`);
  return res.data;
}

export async function saveColumnMappings(id, mappings) {
  const res = await api.post(`/datasets/${id}/mappings`, { mappings });
  return res.data;
}

export async function getColumnMappings(id) {
  const res = await api.get(`/datasets/${id}/mappings`);
  return res.data;
}

// Dashboard
export async function getDashboardKpis(id) {
  const res = await api.get(`/dashboard/${id}/kpis`);
  return res.data;
}

export async function getTimeSeries(id, column, period = 'monthly') {
  const params = { period };
  if (column) params.column = column;
  const res = await api.get(`/dashboard/${id}/timeseries`, { params });
  return res.data;
}

export async function getCategoryBreakdown(id, valueColumn) {
  const params = {};
  if (valueColumn) params.value_column = valueColumn;
  const res = await api.get(`/dashboard/${id}/category-breakdown`, { params });
  return res.data;
}

export async function getRegionBreakdown(id, valueColumn) {
  const params = {};
  if (valueColumn) params.value_column = valueColumn;
  const res = await api.get(`/dashboard/${id}/region-breakdown`, { params });
  return res.data;
}

export async function getMonthlyTrend(id) {
  const res = await api.get(`/dashboard/${id}/monthly-trend`);
  return res.data;
}

// Forecast
export async function runForecast(id, { column, periods = 6, periodType = 'monthly' } = {}) {
  const params = { periods, period_type: periodType };
  if (column) params.column = column;
  const res = await api.post(`/forecast/${id}`, null, { params });
  return res.data;
}

// Customers
export async function runSegmentation(id, maxClusters = 8) {
  const res = await api.post(`/customers/${id}/segment`, null, { params: { max_clusters: maxClusters } });
  return res.data;
}

// Products
export async function getProductProfitability(id) {
  const res = await api.get(`/products/${id}/profitability`);
  return res.data;
}

// Diagnosis
export async function getDiagnosis(id, metric) {
  const params = {};
  if (metric) params.metric = metric;
  const res = await api.get(`/diagnosis/${id}`, { params });
  return res.data;
}

// Simulator
export async function runWhatIf(id, adjustments) {
  const res = await api.post(`/simulator/${id}/what-if`, adjustments);
  return res.data;
}

export async function getExplanation(id) {
  const res = await api.get(`/simulator/${id}/explain`);
  return res.data;
}

export default api;
