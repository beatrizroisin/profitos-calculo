import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export const ROLE_LABELS: Record<string,string> = {
  OWNER:'Proprietário', ADMIN:'Administrador', MANAGER:'Gerente', MEMBER:'Membro', VIEWER:'Visualizador',
};
export const ROLE_DESCRIPTIONS: Record<string,string> = {
  OWNER:   'Acesso total. Gerencia usuários, convida, altera roles e configurações.',
  ADMIN:   'Acesso total ao sistema. Pode convidar e editar roles (exceto OWNER).',
  MANAGER: 'Acesso a clientes, precificação, transações e importações. Sem configurações.',
  MEMBER:  'Visualiza dashboard, clientes e transações. Sem permissão de edição.',
  VIEWER:  'Somente visualiza o dashboard. Sem acesso a dados sensíveis.',
};

const HIERARCHY = ['VIEWER','MEMBER','MANAGER','ADMIN','OWNER'];
export function canManageRole(actor: string, target: string): boolean {
  return HIERARCHY.indexOf(actor) > HIERARCHY.indexOf(target);
}
export function hasPermission(role: string, permission: string): boolean {
  const map: Record<string,string[]> = {
    OWNER:   ['*'],
    ADMIN:   ['dashboard','clients','pricing','transactions','imports','users'],
    MANAGER: ['dashboard','clients','pricing','transactions','imports'],
    MEMBER:  ['dashboard','clients.read','transactions.read'],
    VIEWER:  ['dashboard'],
  };
  const perms = map[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login', newUser: '/onboarding' },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existing = await prisma.user.findUnique({ where: { email: user.email! } });
        if (existing && !existing.isActive) return false; // blocked user
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      // On sign-in or session update, fetch fresh data from DB
      if (user?.email || trigger === 'update') {
        const email = user?.email || token.email as string;
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            include: { company: { select: { id:true, name:true } } },
          });
          if (dbUser) {
            token.id          = dbUser.id;
            token.companyId   = dbUser.companyId;
            token.companyName = dbUser.company?.name ?? '';
            token.role        = dbUser.role;
            token.avatarUrl   = dbUser.avatarUrl ?? (user as any)?.image ?? '';
            token.isActive    = dbUser.isActive;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as any;
        u.id          = token.id;
        u.companyId   = token.companyId;
        u.companyName = token.companyName;
        u.role        = token.role;
        u.avatarUrl   = token.avatarUrl;
        u.isActive    = token.isActive;
      }
      return session;
    },
  },

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'E-mail',  type: 'email'    },
        password: { label: 'Senha',   type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: { company: { select: { id:true, name:true } } },
        });
        if (!user || !user.isActive || !user.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, name: user.name, email: user.email, image: user.avatarUrl };
      },
    }),
  ],
};

export function getSessionUser(session: any) {
  return session?.user as {
    id: string; name: string; email: string; avatarUrl?: string;
    companyId: string; companyName: string; role: string; isActive: boolean;
  } | null;
}
