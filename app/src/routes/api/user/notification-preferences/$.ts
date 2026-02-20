import { createFileRoute } from '@tanstack/react-router'

import { prisma } from '@/db'
import { auth } from '@/lib/auth'

const VALID_REMINDER_DAYS = [1, 3, 7] as const

type NotificationPreferencePayload = {
  emailAgreementStatusUpdates: boolean
  emailExpiryReminders: boolean
  emailSignatureRequests: boolean
  emailWitnessConfirmation: boolean
  inAppAgreementStatusUpdates: boolean
  inAppExpiryReminders: boolean
  inAppSignatureRequests: boolean
  inAppWitnessConfirmation: boolean
  reminderDays: Array<number>
}

function normalizeReminderDays(reminderDays: unknown): Array<number> {
  if (!Array.isArray(reminderDays)) return [1, 3, 7]
  const values = reminderDays
    .map((value) => Number(value))
    .filter((value) => VALID_REMINDER_DAYS.includes(value as (typeof VALID_REMINDER_DAYS)[number]))
  return [...new Set(values)].sort((a, b) => a - b)
}

export const Route = createFileRoute('/api/user/notification-preferences/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const preferences = await prisma.userSetting.upsert({
          where: { userId: session.user.id },
          create: { userId: session.user.id },
          update: {},
        })

        return Response.json({
          preferences: {
            emailSignatureRequests: preferences.emailSignatureRequests,
            inAppSignatureRequests: preferences.inAppSignatureRequests,
            emailAgreementStatusUpdates: preferences.emailAgreementStatusUpdates,
            inAppAgreementStatusUpdates: preferences.inAppAgreementStatusUpdates,
            emailWitnessConfirmation: preferences.emailWitnessConfirmation,
            inAppWitnessConfirmation: preferences.inAppWitnessConfirmation,
            emailExpiryReminders: preferences.emailExpiryReminders,
            inAppExpiryReminders: preferences.inAppExpiryReminders,
            reminderDays: preferences.reminderDays,
          },
        })
      },

      PUT: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const body = (await request.json()) as Partial<NotificationPreferencePayload>

          const preferences = await prisma.userSetting.upsert({
            where: { userId: session.user.id },
            create: {
              userId: session.user.id,
              emailSignatureRequests: Boolean(body.emailSignatureRequests),
              inAppSignatureRequests: Boolean(body.inAppSignatureRequests),
              emailAgreementStatusUpdates: Boolean(body.emailAgreementStatusUpdates),
              inAppAgreementStatusUpdates: Boolean(body.inAppAgreementStatusUpdates),
              emailWitnessConfirmation: Boolean(body.emailWitnessConfirmation),
              inAppWitnessConfirmation: Boolean(body.inAppWitnessConfirmation),
              emailExpiryReminders: Boolean(body.emailExpiryReminders),
              inAppExpiryReminders: Boolean(body.inAppExpiryReminders),
              reminderDays: normalizeReminderDays(body.reminderDays),
            },
            update: {
              emailSignatureRequests: Boolean(body.emailSignatureRequests),
              inAppSignatureRequests: Boolean(body.inAppSignatureRequests),
              emailAgreementStatusUpdates: Boolean(body.emailAgreementStatusUpdates),
              inAppAgreementStatusUpdates: Boolean(body.inAppAgreementStatusUpdates),
              emailWitnessConfirmation: Boolean(body.emailWitnessConfirmation),
              inAppWitnessConfirmation: Boolean(body.inAppWitnessConfirmation),
              emailExpiryReminders: Boolean(body.emailExpiryReminders),
              inAppExpiryReminders: Boolean(body.inAppExpiryReminders),
              reminderDays: normalizeReminderDays(body.reminderDays),
            },
          })

          return Response.json({
            preferences: {
              emailSignatureRequests: preferences.emailSignatureRequests,
              inAppSignatureRequests: preferences.inAppSignatureRequests,
              emailAgreementStatusUpdates: preferences.emailAgreementStatusUpdates,
              inAppAgreementStatusUpdates: preferences.inAppAgreementStatusUpdates,
              emailWitnessConfirmation: preferences.emailWitnessConfirmation,
              inAppWitnessConfirmation: preferences.inAppWitnessConfirmation,
              emailExpiryReminders: preferences.emailExpiryReminders,
              inAppExpiryReminders: preferences.inAppExpiryReminders,
              reminderDays: preferences.reminderDays,
            },
            success: true,
          })
        } catch (error) {
          console.error('Error updating notification preferences:', error)
          return Response.json({ error: 'Invalid request payload' }, { status: 400 })
        }
      },
    },
  },
})
