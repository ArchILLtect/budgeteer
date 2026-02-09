import "./amplifyConfig";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react/styled-system';
import { defaultSystem } from '@chakra-ui/react/preset';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={(defaultSystem)}>
      <BrowserRouter>
      <App />
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
