import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { IUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trainerId: string | null;
}

export async function authorizeCredentials(
  email: string,
  password: string,
  userRepo: IUserRepository,
): Promise<AuthorizedUser | null> {
  const user = await userRepo.findByEmail(email);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    trainerId: user.trainerId?.toString() ?? null,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const repo = new MongoUserRepository();
        return authorizeCredentials(
          credentials.email as string,
          credentials.password as string,
          repo,
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as AuthorizedUser;
        token.id = u.id;
        token.role = u.role;
        token.trainerId = u.trainerId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.trainerId = token.trainerId as string | null;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
