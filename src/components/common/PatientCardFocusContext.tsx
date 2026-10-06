import React, { createContext, useContext, useMemo, useState } from 'react';

interface PatientCardFocusValue {
  focusedCard: string | null;
  focusCard: (cardId: string) => void;
}

const PatientCardFocusContext = createContext<PatientCardFocusValue | null>(null);

export function PatientCardFocusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const value = useMemo(
    () => ({ focusedCard, focusCard: setFocusedCard }),
    [focusedCard],
  );

  return (
    <PatientCardFocusContext.Provider value={value}>
      {children}
    </PatientCardFocusContext.Provider>
  );
}

export function usePatientCardFocus() {
  const context = useContext(PatientCardFocusContext);
  if (!context) {
    throw new Error(
      'usePatientCardFocus must be used inside PatientCardFocusProvider.',
    );
  }
  return context;
}

export const focusedCardOutline = {
  borderColor: '#2DD4BF',
  borderWidth: 2,
} as const;
