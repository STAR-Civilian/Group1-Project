// src/components/AppFooter.jsx
// Disclaimer footer. Rendered once in App.jsx so it shows on every page.
import "../css-styling/AppFooter.css";

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <p>
        STAR Civilian is an independent capstone prototype. It is not affiliated
        with or endorsed by the U.S. Department of Veterans Affairs or the
        Department of Defense.
      </p>
      <p>
        Includes information from O*NET Web Services. O*NET® is a trademark of
        USDOL/ETA.
      </p>
    </footer>
  );
}