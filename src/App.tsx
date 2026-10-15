import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import IntelligenceConsole from './pages/IntelligenceConsole';
import BatteryAssessment from './pages/BatteryAssessment';
import ApplicationMatcher from './pages/ApplicationMatcher';
import DigitalPassport from './pages/DigitalPassport';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<IntelligenceConsole />} />
          <Route path="/assessment" element={<BatteryAssessment />} />
          <Route path="/matcher" element={<ApplicationMatcher />} />
          <Route path="/passport" element={<DigitalPassport />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
