import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    const path  = req.nextUrl.pathname;

    // If authenticated but no company → redirect to onboarding (Google new users)
    if (!token?.companyId && path !== '/onboarding' && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // Role-based protection
    if (path.startsWith('/usuarios') || path.startsWith('/configuracoes')) {
      if (!['OWNER','ADMIN'].includes(token?.role as string))
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (path.startsWith('/importar') || path.startsWith('/precificacao')) {
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
    '/dashboard/:path*', '/clientes/:path*', '/metas/:path*', '/churn/:path*',
    '/ceo/:path*', '/simulador/:path*', '/precificacao/:path*', '/importar/:path*', '/time/:path*',
    '/pagar/:path*', '/receber/:path*', '/runrunit/:path*', '/usuarios/:path*', '/configuracoes/:path*',
    '/onboarding',
  ],
};
