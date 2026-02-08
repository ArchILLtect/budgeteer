import { Box, Container, Flex } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Planner from './pages/Planner';
import Accounts from './pages/Accounts';
import Tracker from './pages/Tracker';
import Imports from './pages/Imports';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Flex minH="100vh" direction="column" bg="gray.50">
        <Navigation />
        <Box as="main" flex="1" py={{ base: 6, md: 10 }}>
          <Container maxW="6xl" px={{ base: 4, md: 8 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/planner" replace />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/imports" element={<Imports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Container>
        </Box>
        <Footer />
      </Flex>
    </Router>
  );
}

export default App;
