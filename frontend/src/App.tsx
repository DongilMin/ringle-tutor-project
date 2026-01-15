import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Purchase from './pages/Purchase';
import Conversation from './pages/Conversation';
import { ConversationProvider } from './context/ConversationContext';

function App() {
  return (
    <Router>
      <ConversationProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/conversation" element={<Conversation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConversationProvider>
    </Router>
  );
}

export default App;