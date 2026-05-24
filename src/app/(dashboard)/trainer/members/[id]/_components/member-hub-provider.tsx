'use client';

import { createContext, use, useMemo } from 'react';

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
  const contextValue = useMemo(() => ({ basePath }), [basePath]);
  return (
    <MemberHubContext.Provider value={contextValue}>
      {children}
    </MemberHubContext.Provider>
  );
}

export function useMemberHub(): MemberHubContextValue {
  return use(MemberHubContext);
}
