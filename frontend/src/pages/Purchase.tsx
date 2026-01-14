// frontend/src/pages/Purchase.tsx
import React from 'react';
import { PlanSelector } from '../components/PlanSelector';

const Purchase: React.FC = () => {
  const handleSelectPlan = (planId: string) => {
    console.log(`Selected plan: ${planId}`);
    // Here you would typically initiate the purchase process
    alert(`You selected the ${planId} plan!`);
  };

  return (
    <div>
      <h1>Purchase Membership</h1>
      <PlanSelector onSelectPlan={handleSelectPlan} />
    </div>
  );
};

export default Purchase;