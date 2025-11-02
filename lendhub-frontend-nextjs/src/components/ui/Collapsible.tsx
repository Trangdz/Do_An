import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | undefined>(undefined);

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Collapsible({ 
  open: controlledOpen, 
  onOpenChange, 
  children, 
  defaultOpen = false 
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps {
  asChild?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleTrigger({ asChild, children, className }: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error('CollapsibleTrigger must be used within Collapsible');
  }

  const handleClick = () => {
    context.onOpenChange(!context.open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      className: className ? `${children.props.className || ''} ${className}` : children.props.className,
    });
  }

  return (
    <div onClick={handleClick} className={className} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  );
}

interface CollapsibleContentProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext);
  
  if (!context) {
    throw new Error('CollapsibleContent must be used within Collapsible');
  }

  if (!context.open) {
    return null;
  }

  return <div className={className}>{children}</div>;
}




