// frontend/src/components/PlanSelector.tsx
import React from 'react';

interface PlanSelectorProps {
  onSelectPlan: (planId: string) => void;
}

export const PlanSelector: React.FC<PlanSelectorProps> = ({ onSelectPlan }) => {
  const plans = [
    { id: 'basic', name: 'Basic Plan', price: '$9.99/month' },
    { id: 'premium', name: 'Premium Plan', price: '$19.99/month' },
  ];

  return (
    <div style={{ border: '1px solid lightgray', padding: '15px', margin: '10px', borderRadius: '5px' }}>
      <h2>Select a Membership Plan</h2>
      {plans.map((plan) => (
        <div key={plan.id} style={{ marginBottom: '10px' }}>
          <h3>{plan.name}</h3>
          <p>{plan.price}</p>
          <button onClick={() => onSelectPlan(plan.id)}>Select {plan.name}</button>
        </div>
      ))}
    </div>
  );
};
