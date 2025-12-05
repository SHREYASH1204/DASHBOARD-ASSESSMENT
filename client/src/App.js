import React from 'react';
import UserDashboard from './UserDashboard';
import AdminDashboard from './AdminDashboard';

function App() {
  // Simple switch—choose dashboard to display
  // For real app, use routing or authentication.
  const SHOW_ADMIN = true; // set true for admin

  return (
    <div>
      {SHOW_ADMIN ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
}

export default App;