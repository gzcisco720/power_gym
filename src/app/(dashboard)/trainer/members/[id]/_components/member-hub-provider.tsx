'use client';

import { createContext, useContext } from 'react';

interface MemberHubContextValue {
  basePath: string;
}

const MemberHubContext = createContext<MemberHubContextValue>({
  basePath: '/trainer/members',
});

export function MemberHubProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <MemberHubContext.Provider value={{ basePath }}>
      {children}
    </MemberHubContext.Provider>
  );
}

export function useMemberHub(): MemberHubContextValue {
  return useContext(MemberHubContext);
}
