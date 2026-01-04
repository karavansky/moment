import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MyTicketsList from './MyTicketsList'
import { Button } from '@heroui/react'
import { localizedLink } from '@/utils/localizedLink'
import {  SupportedLocale } from '@/config/locales'
import { useLanguage } from '@/hooks/useLanguage'


interface MyTicketsPageProps {
  params: {
    lang: SupportedLocale
  }
}

export default async function MyTicketsPage({ params }: MyTicketsPageProps) {
    const { lang } = await params
//const lang = useLanguage()
  const session = await auth()

  if (!session?.user?.email) {
    redirect(localizedLink('support', lang))
  }

  return (
    <div className="container mx-auto pt-12 ">
      <MyTicketsList lang={lang} userEmail={session.user.email} />
    </div>
  )
}
