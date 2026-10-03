import React from 'react';
import { useDraggableScroll } from '../../hooks/useDraggableScroll';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  dragSpeed?: number;
}

/**
 * Contêiner deslizável universal com suporte a Mouse Drag & Swipe Touch
 */
export const DraggableScrollContainer: React.FC<Props> = ({
  children,
  className = '',
  dragSpeed = 1.3,
  ...props
}) => {
  const ref = useDraggableScroll<HTMLDivElement>({ dragSpeed });

  return (
    <div
      ref={ref}
      className={`overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
