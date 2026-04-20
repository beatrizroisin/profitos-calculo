import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    const path  = req.nextUrl.pathname;

    // If authenticated but no company → redirect to onboarding
    if (!token?.companyId && path !== '/onboarding' && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // ADMIN/OWNER only for user management; MANAGER can access configuracoes
    if (path.startsWith('/usuarios')) {
      if (!['OWNER','ADMIN'].includes(token?.role as string))
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (path.startsWith('/configuracoes')) {
      if (!['OWNER','ADMIN','MANAGER'].includes(token?.role as string))
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // MANAGER+ only
    if (
      path.startsWith('/precificacao') ||
      path.startsWith('/colaboradores') ||
      path.startsWith('/time')
    ) {
      if (!['OWNER','ADMIN','MANAGER'].includes(token?.role as string))
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: '/login' },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*', '/clientes/:path*', '/colaboradores/:path*',
    '/metas/:path*', '/churn/:path*', '/ceo/:path*', '/simulador/:path*',
    '/precificacao/:path*', '/time/:path*',
    '/pagar/:path*', '/receber/:path*', '/runrunit/:path*',
    '/usuarios/:path*', '/configuracoes/:path*',
    '/onboarding',
  ],
};
