import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p>&copy; {new Date().getFullYear()} Budgetizer. A privacy-aware personal finance app.</p>
      </div>
    </footer>
  );
}
