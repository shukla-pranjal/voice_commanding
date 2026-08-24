import { useState } from "react";
import Header from "./components/Header.jsx";
import ShoppingListPage from "./pages/ShoppingListPage.jsx";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");

  return (
    <div className={`app-shell${darkMode ? " dark-mode" : ""}`}>
      <Header
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((current) => !current)}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />
      <main className="app-main">
        <ShoppingListPage selectedLanguage={selectedLanguage} />
      </main>
      <footer className="app-footer" style={{ textAlign: "center", padding: "1rem", fontSize: "0.85rem", color: "#666" }}>
        Copyright &copy; 2026 Pranjal Kr Shukla. All Rights Reserved.<br />
        <span style={{ fontSize: "0.75rem" }}>Strictly for Hackathon Evaluation. Unauthorized copying is prohibited.</span>
      </footer>
    </div>
  );
}

export default App;
