import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import ClientsReport from '@/components/reports/ClientsReport'

export default async function ClientsReportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const session = await auth()

  // Проверка доступа: только status=0 (Directors) или status=7 (Sport- und Bäderamt)
  const hasAccess = session?.user?.status === 0 || session?.user?.status === 7

  if (!hasAccess) {
    redirect(`/${lang}`)
  }

  return <ClientsReport />
}
