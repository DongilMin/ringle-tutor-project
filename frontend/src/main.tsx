import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Home from './pages/Home.tsx';
import Conversation from './pages/Conversation.tsx';
import Purchase from './pages/Purchase.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/conversation" element={<Conversation />} />
        <Route path="/purchase" element={<Purchase />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
