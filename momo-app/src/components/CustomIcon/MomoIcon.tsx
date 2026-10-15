// components/MomoIcon.jsx
// components/CustomIcon/MomoIcon.tsx
import React from 'react';

interface MomoIconProps {
  className?: string;
}

export function MomoIcon({ className }: MomoIconProps) {
  return (
    <svg
      xmlns="http://w3.org"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2" /* Stroke thoda thick kiya hai taaki clear dikhe */
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Momo Outer Boundary - Thoda upar aur bada shift kiya hai bounding box me */}
      <path d="M2 15c0-5 4.5-9 10-9s10 4 10 9-4 4.5-10 4.5S2 19.5 2 15z" />
      
      {/* Folds / Pleats - Centered perfectly */}
      <path d="M12 6v6" />
      <path d="M7.5 7.5c.5 1.5 1.5 3.5 2.5 4.5" />
      <path d="M16.5 7.5c-.5 1.5-1.5 3.5-2.5 4.5" />
      <path d="M4.5 11c1.5 1.5 3 2.5 5 3" />
      <path d="M19.5 11c-1.5 1.5-3 2.5-5 3" />
    </svg>
  );
}

