import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/types/auth';

export interface AuthorizedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  trainerId: string | null;
  remember?: boolean;
}

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as AuthorizedUser;
        token.id = u.id;
        token.firstName = u.firstName;
        token.lastName = u.lastName;
        token.role = u.role;
        token.trainerId = u.trainerId;
        const ttl = u.remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
        token.exp = Math.floor(Date.now() / 1000) + ttl;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.firstName = token.firstName as string;
      session.user.lastName = token.lastName as string;
      session.user.name = `${token.firstName} ${token.lastName}`;
      session.user.role = token.role as UserRole;
      session.user.trainerId = token.trainerId as string | null;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
