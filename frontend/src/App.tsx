import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Purchase from './pages/Purchase';
import Conversation from './pages/Conversation';
import Learning from './pages/Learning';
import Analysis from './pages/Analysis';
import Admin from './pages/Admin';
import { UserProvider } from './context/UserContext';
import { ConversationProvider } from './context/ConversationContext';

function App() {
  return (
    <Router>
      <UserProvider>
        <ConversationProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route path="/learning" element={<Learning />} />
            <Route path="/conversation" element={<Conversation />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ConversationProvider>
      </UserProvider>
    </Router>
  );
}

export default App;
