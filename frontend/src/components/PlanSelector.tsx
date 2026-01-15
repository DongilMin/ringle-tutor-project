// frontend/src/components/PlanSelector.tsx
import React, { useEffect, useState } from 'react';
import { membershipPlansApi, type MembershipPlan } from '../services/api';

interface PlanSelectorProps {
  onSelectPlan: (planId: string) => void;
}

export const PlanSelector: React.FC<PlanSelectorProps> = ({ onSelectPlan }) => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      setError(null);

      const response = await membershipPlansApi.getAll();

      if (response.success && response.data) {
        setPlans(response.data as MembershipPlan[]);
      } else {
        setError((response.error as any)?.message || 'Failed to load plans');
      }

      setLoading(false);
    };

    loadPlans();
  }, []);

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'KRW') {
      return `₩${price.toLocaleString()}/month`;
    }
    return `${currency} ${price}/month`;
  };

  if (loading) {
    return (
      <div
        style={{
          border: '1px solid lightgray',
          padding: '15px',
          margin: '10px',
          borderRadius: '5px',
        }}
      >
        <p>Loading plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          border: '1px solid lightgray',
          padding: '15px',
          margin: '10px',
          borderRadius: '5px',
        }}
      >
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid lightgray',
        padding: '15px',
        margin: '10px',
        borderRadius: '5px',
      }}
    >
      <h2>Select a Membership Plan</h2>
      {plans.map((plan) => (
        <div
          key={plan.id}
          style={{
            marginBottom: '15px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
          }}
        >
          <h3>{plan.name}</h3>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            {formatPrice(plan.price, plan.currency)}
          </p>
          <ul style={{ textAlign: 'left', marginBottom: '10px' }}>
            {plan.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          <button onClick={() => onSelectPlan(plan.id)}>Select {plan.name}</button>
        </div>
      ))}
    </div>
  );
};
