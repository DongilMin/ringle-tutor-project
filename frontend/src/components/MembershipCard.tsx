// frontend/src/components/MembershipCard.tsx
import React from 'react';

interface MembershipCardProps {
  status: 'active' | 'expired' | 'none';
  remainingDays?: number;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ status, remainingDays }) => {
  const getStatusText = (status: 'active' | 'expired' | 'none') => {
    switch (status) {
      case 'active':
        return `Active - ${remainingDays} days left`;
      case 'expired':
        return 'Expired';
      case 'none':
        return 'No Membership';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div style={{ border: '1px solid gray', padding: '10px', margin: '10px', borderRadius: '5px' }}>
      <h2>Membership Status</h2>
      <p>{getStatusText(status)}</p>
      {status === 'none' && (
        <button onClick={() => console.log('Go to purchase page')}>
          Purchase Membership
        </button>
      )}
    </div>
  );
};
