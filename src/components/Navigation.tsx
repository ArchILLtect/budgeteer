import { Link } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <h1 className="nav-logo">Budgetizer</h1>
        <ul className="nav-links">
          <li><Link to="/planner">Planner</Link></li>
          <li><Link to="/accounts">Accounts</Link></li>
          <li><Link to="/tracker">Tracker</Link></li>
          <li><Link to="/imports">Imports</Link></li>
          <li><Link to="/settings">Settings</Link></li>
        </ul>
      </div>
    </nav>
  );
}
