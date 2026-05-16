import React from 'react';
import AppRouter from './Router';
import { BillingStatusProvider } from './context/BillingStatusContext';

function App() {
  return (
    <BillingStatusProvider>
      <AppRouter />
    </BillingStatusProvider>
  );
}

export default App;
