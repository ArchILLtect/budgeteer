import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Planner from './pages/Planner';
import Accounts from './pages/Accounts';
import Tracker from './pages/Tracker';
import Imports from './pages/Imports';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/planner" replace />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/imports" element={<Imports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
