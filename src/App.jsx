import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import SatelliteCompare from './pages/SatelliteCompare';
import GISMap from './pages/GISMap';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import CaseDetail from './pages/CaseDetail';
import { LocationProvider } from './context/LocationContext';

// Layout wrapper – Sidebar + Header + scrollable main
const AppLayout = ({ children }) => (
  <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        {children}
      </main>
    </div>
  </div>
);

function App() {
  return (
    <LocationProvider>
      <Router>
        <Routes>
          {/* Full-screen landing — no sidebar */}
          <Route path="/" element={<LandingPage />} />

          {/* Dashboard routes inside AppLayout */}
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/compare"   element={<AppLayout><SatelliteCompare /></AppLayout>} />
          <Route path="/map"       element={<AppLayout><GISMap /></AppLayout>} />
          <Route path="/alerts"    element={<AppLayout><Alerts /></AppLayout>} />
          <Route path="/cases/:id" element={<AppLayout><CaseDetail /></AppLayout>} />
          <Route path="/settings"  element={<AppLayout><Settings /></AppLayout>} />
        </Routes>
      </Router>
    </LocationProvider>
  );
}

export default App;
