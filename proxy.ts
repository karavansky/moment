import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { allLocales, supportedLocales, defaultLocale } from "./config/locales";
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import { auth } from '@/lib/auth'

// Store for tracking requests (в продакшене лучше использовать Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Список подозрительных путей
const SUSPICIOUS_PATHS = [
  '/wp-admin',
  '/wp-includes',
  '/wp-content',
  '/wordpress',
  '/xmlrpc.php',
  '/wp-login.php',
  '/.env',
  '/.git',
  '/admin',
  '/phpmyadmin',
]

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 100, // максимум запросов за окно
}

function getLocale(request: NextRequest): string {
  // ПРИОРИТЕТ 1: Проверяем cookie preferred-language (установлен пользователем)
  const cookies = request.cookies.get('preferred-language')?.value;
  if (cookies && supportedLocales.includes(cookies as any)) {
    console.log(`[getLocale] Using preferred language from cookie: ${cookies}`);
    return cookies;
  }

  // ПРИОРИТЕТ 2: Определяем язык по заголовку Accept-Language браузера
  const acceptLanguage = request.headers.get("accept-language") || "";
  console.log(`[getLocale] Accept-Language header: ${acceptLanguage}`);

  const negotiator = new Negotiator({
    headers: { "accept-language": acceptLanguage },
  } as any);
  const languages = negotiator.languages();

  // Пытаемся найти совпадение среди всех локалей
  let matchedLocale: string;
  try {
    matchedLocale = match(languages, [...allLocales], defaultLocale);
  } catch {
    matchedLocale = defaultLocale;
  }

  console.log(`[getLocale] Matched locale from browser: ${matchedLocale}`);

  // Если найденная локаль не поддерживается (нет словаря), используем дефолтную
  if (!supportedLocales.includes(matchedLocale as any)) {
    console.log(`[getLocale] Locale ${matchedLocale} not supported, falling back to ${defaultLocale}`);
    return defaultLocale;
  }

  return matchedLocale;
}

const protectedRoutes = ["/clean", "/logs", "/sessions", "/downloads"];

export default async function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const path = request.nextUrl.pathname

  // Debug: log all requests to /pl or /it
 // if (path === '/pl' || path === '/it') {
 //   console.log(`[Proxy DEBUG] Request to ${path}, supportedLocales:`, supportedLocales);
 // }

  //console.log(`[Request] ${ip} -> ${path}`)
  // Skip internal, API and static asset requests
  if (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path === "/favicon.ico" ||
    path === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // Root path handled by app/page.tsx - returns 200 OK with content
  // This is the recommended approach for multilingual sites
  if (path === "/") {
    const locale = getLocale(request);
    const response = NextResponse.next();
    response.headers.set('Content-Language', locale);
    console.log(`[Root] Serving root page with detected locale ${locale} for ${ip}`);
    return response;
  }
  // Блокировка подозрительных путей
  if (SUSPICIOUS_PATHS.some(suspiciousPath => path.startsWith(suspiciousPath))) {
    console.log(`[Security] Blocked suspicious request from ${ip} to ${path}`)
    return new NextResponse('Not Found', { status: 404 })
  }

  // Rate limiting
  const now = Date.now()
  const userKey = `${ip}`
  const userRequests = requestCounts.get(userKey)

  if (userRequests) {
    if (now < userRequests.resetTime) {
      if (userRequests.count >= RATE_LIMIT.maxRequests) {
        console.log(`[Security] Rate limit exceeded for ${ip}`)
        return new NextResponse('Too Many Requests', { status: 429 })
      }
      userRequests.count++
    } else {
      // Reset counter
      requestCounts.set(userKey, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
    }
  } else {
    requestCounts.set(userKey, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
  }

  // Очистка старых записей
  if (requestCounts.size > 10000) {
    const keysToDelete: string[] = []
    requestCounts.forEach((value, key) => {
      if (now > value.resetTime) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => requestCounts.delete(key))
  }
  // Skip requests that look like static files (have an extension in last segment)
  const lastSegment = path.split("/").pop() || "";
  if (lastSegment.includes(".")) return NextResponse.next();

  // Check if this is a bot/crawler (nginx sets X-Is-Bot header)
  const xIsBot = request.headers.get("x-is-bot");
  const isBot = xIsBot === "1";

  // Check if pathname already contains a locale prefix
  const pathnameHasLocale = supportedLocales.some(
    (locale: string) => path === `/${locale}` || path.startsWith(`/${locale}/`)
  );

  // Debug logging for PL locale
  if (path.includes('/pl')) {
    console.log(`[Proxy] PL route detected! path="${path}", pathnameHasLocale=${pathnameHasLocale}, supportedLocales includes pl:`, supportedLocales.includes('pl' as any));
  }

  // If this is a bot and path has non-English locale, redirect to English
  if (isBot && pathnameHasLocale) {
    console.log(`[Bot] Detected bot from ${ip} accessing path with locale: ${path}`);
    const currentLocale = path.split("/")[1];
    if (currentLocale !== "en") {
      // Bot accessing non-English page, redirect to English
      const pathWithoutLocale = path.substring(currentLocale.length + 1); // Remove /de
      const newUrl = request.nextUrl.clone();
      newUrl.pathname = `/en${pathWithoutLocale}`;
      return NextResponse.redirect(newUrl, 301); // Permanent redirect for SEO
    }
    // Bot accessing English page, continue
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));

  if (isProtected) {
    // console.log(`[Auth] Accessing protected route: ${path}`);
    // For protected routes, ensure a valid auth session is present
    const session = await auth();
    if (!session) {
      // Redirect to localized signin page
      const locale = getLocale(request);
      const loginUrl = new URL(`/${locale}/auth/signin`, request.url);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If pathname already has locale, check role guard and add Content-Language header
  if (pathnameHasLocale)  {
    const currentLocale = path.split("/")[1];
    const pathAfterLocale = path.substring(currentLocale.length + 1); // e.g. "/dienstplan" or "/staff"

    // Role guard: worker (status=1) and client (status=2) can only access /dienstplan and /auth/*
    const isAllowedForRestricted = pathAfterLocale.startsWith('/dienstplan')
      || pathAfterLocale.startsWith('/auth')

    if (!isAllowedForRestricted) {
      const session = await auth()
      const userStatus = session?.user?.status
      if (userStatus === 1 || userStatus === 2) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = `/${currentLocale}/dienstplan`
        return NextResponse.redirect(redirectUrl)
      }
    }

    const response = NextResponse.next();
    response.headers.set('Content-Language', currentLocale);
    return response;
  }

  // For bots without locale prefix, redirect to English
  if (isBot) {
    const newUrl = request.nextUrl.clone();
    newUrl.pathname = `/en${path}`;
    return NextResponse.redirect(newUrl, 301); // Permanent redirect for SEO
  }

  // Add locale prefix to pathname for regular users
  const locale = getLocale(request);
  const newUrl = request.nextUrl.clone();
  newUrl.pathname = `/${locale}${path}`;
  //console.log(`[Locale] Redirecting ${ip} to locale ${locale} for path ${path}`);
  return NextResponse.redirect(newUrl);
  //return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
