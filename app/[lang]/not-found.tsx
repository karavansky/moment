import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="text-center px-6 py-12">
      <h1 className="text-6xl font-bold text-earth-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-earth-700 mb-6">Page Not Found</h2>
      <p className="text-earth-600 mb-8 max-w-md mx-auto">
        Sorry, we couldn't find the page you're looking for. Please check the URL or return to
        the homepage.
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-3 bg-earth-700 text-sand-50 rounded-lg hover:bg-earth-800 transition-colors"
      >
        Go to Homepage
      </Link>
    </div>
  )
}
