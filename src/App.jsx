// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import TalkPageWebRTC from "./pages/TalkPageWebRTC";
import ReviewPage from "./pages/ReviewPage";
import NavBar from './components/NavBar';
import { GlobalStyles } from './styles/GlobalStyles';

function App() {
  return (
    <>
      <GlobalStyles />
      <Router>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/talk-webrtc" element={<TalkPageWebRTC />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
