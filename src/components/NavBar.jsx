// frontend/src/components/NavBar.jsx
import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { styled as muiStyled } from '@mui/material/styles';

const CyberAppBar = muiStyled(AppBar)`
  background: rgba(0, 0, 0, 0.8) !important;
  border-bottom: 1px solid #00ff00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3) !important;
`;

const CyberButton = muiStyled(Button)`
  color: #00ff00 !important;
  font-family: 'Orbitron', sans-serif !important;
  text-transform: uppercase;
  position: relative;
  margin: 0 1rem;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: #00ff00;
    transition: width 0.3s ease;
    box-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  }

  &:hover:after {
    width: 100%;
  }
`;

const CyberTypography = muiStyled(Typography)`
  color: #00ff00 !important;
  font-family: 'Share Tech Mono', monospace !important;
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
`;

const NavBar = () => {
  return (
    <CyberAppBar position="static">
      <Toolbar>
        <CyberButton variant="h6" sx={{ flexGrow: 1 }} component={Link} to="/">
          Talkeys
        </CyberButton>
        <CyberButton component={Link} to="/">
          Home
        </CyberButton>
        <CyberButton component={Link} to="/talk-webrtc">
          Talk
        </CyberButton>
      </Toolbar>
    </CyberAppBar>
  );
};

export default NavBar;
