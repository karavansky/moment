import { auth } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { redirect } from 'next/navigation'

export default async function SeaweedAdminPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const user = await getUserByEmail(session.user.email)

  if (!user?.isAdmin) {
    redirect('/')
  }

  return (
    <div className="container mx-auto pt-24 px-4 py-8 h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">SeaweedFS Storage</h1>
        <a 
          href="/admin/seaweed-proxy/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          Open in new tab
        </a>
      </div>
      <div className="w-full h-full border rounded-lg overflow-hidden bg-white shadow-lg">
        <iframe
          src="/admin/seaweed-proxy/"
          className="w-full h-full border-0"
          title="SeaweedFS Interface"
        />
      </div>
    </div>
  )
}
