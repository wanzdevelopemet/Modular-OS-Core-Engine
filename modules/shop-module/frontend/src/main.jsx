import React from 'react';
import ReactDOM from 'react-dom/client';
import ShopApp from './ShopApp';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ minHeight: '100vh', background: '#030712', color: '#f3f4f6' }}>
      <ShopApp />
    </div>
  </React.StrictMode>
);

