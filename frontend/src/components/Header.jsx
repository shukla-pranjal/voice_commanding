function Header({ darkMode, onToggleTheme, selectedLanguage, onLanguageChange }) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div>
          <h1>Shopping Assistant</h1>
          <div className="app-header__subtitle">Your list, by voice or by hand</div>
        </div>
        <div className="header-actions">
          <select
            className="header-lang-select"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Select voice language"
          >
            <option value="en-US">English (US)</option>
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">हिन्दी (Hindi)</option>
            <option value="hinglish">Hinglish (Mixed)</option>
            <option value="es-ES">Español</option>
          </select>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
