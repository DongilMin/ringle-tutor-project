// frontend/src/pages/Home.tsx
import React from 'react';
import { MembershipCard } from '../components/MembershipCard'; // Import MembershipCard

const Home: React.FC = () => {
  // Mock data for demonstration
  const membershipStatus: 'active' | 'expired' | 'none' = 'active';
  const remainingDays = 30;

  return (
    <div>
      <h1>Welcome to AI English Tutor!</h1>
      <p>Your membership status will be displayed here.</p>
      <MembershipCard status={membershipStatus} remainingDays={remainingDays} /> {/* Use MembershipCard */}
    </div>
  );
};

export default Home;
