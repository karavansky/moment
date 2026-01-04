'use client'

import { useState, memo, useMemo } from 'react'
import { Input, TextField, Button } from '@heroui/react'
import { useTranslation } from '@/components/Providers'
import type { SupportedLocale } from '@/config/locales'
import { Form, Description, TextArea, Label, ListBox, Select } from '@heroui/react'

interface SupportTicketFormProps {
  userEmail: string
  lang: SupportedLocale
  isDemo?: boolean
  authOpen?: () => void
}

function SupportTicketForm({ userEmail, lang, isDemo, authOpen }: SupportTicketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const { t } = useTranslation()

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isDemo && authOpen) {
      console.log('Demo mode: triggering authOpen instead of sending message')
      authOpen()
      return
    }

    // Save form reference before async operations
    const form = e.currentTarget
    const formData = new FormData(form)
    const data: Record<string, string> = {}

    // Convert FormData to plain object
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userEmail,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit ticket')
      }

      setSubmitStatus('success')
      // Reset form using saved reference
      form.reset()
    } catch (error) {
      console.error('Error submitting ticket:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = useMemo(
    () => [
      { key: 'technical', label: t('support.form.categoryTechnical') },
      { key: 'billing', label: t('support.form.categoryBilling') },
      { key: 'feature', label: t('support.form.categoryFeature') },
      { key: 'data', label: t('support.form.categoryData') },
      { key: 'other', label: t('support.form.categoryOther') },
    ],
    [t]
  )

  const priorities = [
    { key: 'low', label: t('support.form.priorityLow') },
    { key: 'medium', label: t('support.form.priorityMedium') },
    { key: 'high', label: t('support.form.priorityHigh') },
  ]

  return (
    <Form onSubmit={onSubmit} className="flex flex-col gap-6 m-1">
      {/* Subject */}
      <TextField isRequired name="subject" type="subject">
        <Label>{t('support.form.subject')}</Label>
        <Input placeholder={t('support.form.subjectPlaceholder')} />
        <Description>{t('support.form.subjectRequired')}</Description>
      </TextField>

      {/* Category

      */}
      <Select
        className="w-3/4"
        name="category"
        isRequired
        placeholder={t('support.form.categoryPlaceholder')}
      >
        <Label>{t('support.form.category')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {categories.map(cat => (
              <ListBox.Item key={cat.key} id={cat.key} textValue={cat.label}>
                <ListBox.ItemIndicator />
                {cat.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        <Description>{t('support.form.categoryRequired')}</Description>
      </Select>

      {/* Priority */}
      <Select
        className="w-3/4"
        name="priority"
        isRequired
        placeholder={t('support.form.priorityPlaceholder')}
      >
        <Label>{t('support.form.priority')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {priorities.map(priority => (
              <ListBox.Item key={priority.key} id={priority.key} textValue={priority.label}>
                <ListBox.ItemIndicator />
                {priority.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        <Description>{t('support.form.priorityRequired')}</Description>
      </Select>

      {/* Description */}
      <TextField name="description" isRequired>
        <Label>{t('support.form.description')}</Label>
        <TextArea placeholder={t('support.form.descriptionPlaceholder')} rows={6} />
        <Description>{t('support.form.descriptionRequired')}</Description>
      </TextField>

      {/* Submit Status */}
      {submitStatus === 'success' && (
        <div className="bg-success-50 dark:bg-success-900/20 border-2 border-success text-success-700 dark:text-success px-4 py-3 rounded-xl">
          <p className="font-semibold">{t('support.form.successTitle')}</p>
          <p className="text-sm mt-1">
            {t('support.form.successMessage').replace('{email}', userEmail)}
          </p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="bg-danger-50 dark:bg-danger-900/20 border-2 border-danger text-danger-700 dark:text-danger px-4 py-3 rounded-xl">
          <p className="font-semibold">{t('support.form.errorTitle')}</p>
          <p className="text-sm mt-1">{t('support.form.errorMessage')}</p>
        </div>
      )}

      {/* Submit Button 
      isLoading={isSubmitting}
      */}
      <div className="flex gap-4">
        <Button type="submit" size="lg">
          {isSubmitting ? t('support.form.submitting') : t('support.form.submit')}
        </Button>
        <Button type="reset" variant="secondary">
          Reset
        </Button>
      </div>
    </Form>
  )
}

export default memo(SupportTicketForm)
