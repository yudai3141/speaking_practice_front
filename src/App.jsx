// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar"; // NavBarをインポート
import HomePage from "./pages/HomePage";
import TalkPageWebRTC from "./pages/TalkPageWebRTC";

function App() {
  return (
    <Router>
      <NavBar /> {/* NavBarをRoutesの外に配置 */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/talk-webrtc" element={<TalkPageWebRTC />} />
      </Routes>
    </Router>
  );
}

export default App;
