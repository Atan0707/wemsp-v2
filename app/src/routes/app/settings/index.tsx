import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, ChevronRight, KeyRound, Languages, Loader2, Monitor, Search, Shield, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { authClient } from '@/lib/auth-client'
import { useLanguage } from '@/lib/i18n/context'

export const Route = createFileRoute('/app/settings/')({
  component: RouteComponent,
})

type SettingsPanel = 'active-sessions' | 'change-password' | 'language' | 'notifications' | 'two-factor'
type NotificationPreferenceKey =
  | 'emailAgreementStatusUpdates'
  | 'emailExpiryReminders'
  | 'emailSignatureRequests'
  | 'emailWitnessConfirmation'
  | 'inAppAgreementStatusUpdates'
  | 'inAppExpiryReminders'
  | 'inAppSignatureRequests'
  | 'inAppWitnessConfirmation'

type NotificationPreferences = {
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

type AppLanguage = 'en' | 'ms'

type UserSettings = NotificationPreferences & {
  preferredLanguage: AppLanguage
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailAgreementStatusUpdates: true,
  emailExpiryReminders: true,
  emailSignatureRequests: true,
  emailWitnessConfirmation: true,
  inAppAgreementStatusUpdates: true,
  inAppExpiryReminders: true,
  inAppSignatureRequests: true,
  inAppWitnessConfirmation: true,
  reminderDays: [1, 3, 7],
}

const settingsPanels: Record<SettingsPanel, { description: string; title: string }> = {
  'active-sessions': {
    description: 'Review where your account is signed in and remove sessions you do not recognize.',
    title: 'Active Sessions',
  },
  'change-password': {
    description: 'Update your login password and optionally log out other devices.',
    title: 'Change Password',
  },
  language: {
    description: 'Choose your preferred app language.',
    title: 'Language',
  },
  notifications: {
    description: 'Manage email and in-app alerts for signatures, updates, witness confirmation, and expiry reminders.',
    title: 'Notifications',
  },
  'two-factor': {
    description: 'Add a second verification step for better account protection.',
    title: 'Two-Factor Authentication (2FA)',
  },
}

function RouteComponent() {
  const { language, setLanguage, t } = useLanguage()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [selectedPanel, setSelectedPanel] = useState<SettingsPanel>('language')
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [revokeOtherSessionsOnPasswordChange, setRevokeOtherSessionsOnPasswordChange] = useState(true)
  const [passwordForm, setPasswordForm] = useState({
    confirmNewPassword: '',
    currentPassword: '',
    newPassword: '',
  })
  const [pendingLanguage, setPendingLanguage] = useState<AppLanguage>(language)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  )
  const { data: sessionData } = authClient.useSession()
  const currentSessionToken = (sessionData as any)?.session?.token

  const sessionsQuery = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: async () => {
      const response = await (authClient as any).listSessions()
      if (response?.error) {
        throw new Error(response.error.message || 'Failed to fetch sessions')
      }
      return Array.isArray(response?.data) ? response.data : []
    },
  })

  const sessions = useMemo(
    () =>
      (sessionsQuery.data || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [sessionsQuery.data]
  )

  const notificationPreferencesQuery = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user/notification-preferences', { method: 'GET' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load notification preferences')
      }
      return data.settings as UserSettings
    },
  })

  useEffect(() => {
    if (!notificationPreferencesQuery.data) return
    setNotificationPreferences({
      ...notificationPreferencesQuery.data,
      reminderDays: [...notificationPreferencesQuery.data.reminderDays].sort((a, b) => a - b),
    })
    setPendingLanguage(notificationPreferencesQuery.data.preferredLanguage)
  }, [notificationPreferencesQuery.data])

  const saveNotificationPreferencesMutation = useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save notification preferences')
      }
      return data.settings as UserSettings
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save notification preferences')
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['notification-preferences'], settings)
      setNotificationPreferences({
        ...settings,
        reminderDays: [...settings.reminderDays].sort((a, b) => a - b),
      })
      setPendingLanguage(settings.preferredLanguage)
      toast.success('Notification preferences updated')
    },
  })

  const saveLanguagePreferencesMutation = useMutation({
    mutationFn: async (nextLanguage: AppLanguage) => {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredLanguage: nextLanguage,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save language preference')
      }
      return data.settings as UserSettings
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save language preference')
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['notification-preferences'], settings)
      setPendingLanguage(settings.preferredLanguage)
      setLanguage(settings.preferredLanguage)
      toast.success('Language preference saved')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await (authClient as any).changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        revokeOtherSessions: revokeOtherSessionsOnPasswordChange,
      })
      if (response?.error) {
        throw new Error(response.error.message || 'Failed to change password')
      }
      return response
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password')
    },
    onSuccess: async () => {
      toast.success('Password updated successfully')
      setPasswordForm({
        confirmNewPassword: '',
        currentPassword: '',
        newPassword: '',
      })
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] })
      await queryClient.invalidateQueries({
        predicate: (query) => (query.queryKey[0] as string).includes('session'),
      })
    },
  })

  const revokeOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await (authClient as any).revokeOtherSessions()
      if (response?.error) {
        throw new Error(response.error.message || 'Failed to revoke other sessions')
      }
      return response
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to revoke other sessions')
    },
    onSuccess: async () => {
      toast.success('Other sessions were logged out')
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] })
    },
  })

  const revokeSessionMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await (authClient as any).revokeSession({ token })
      if (response?.error) {
        throw new Error(response.error.message || 'Failed to revoke session')
      }
      return response
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to revoke session')
    },
    onSuccess: async () => {
      toast.success('Session removed')
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] })
    },
  })

  const onChangePassword = (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      toast.error('All password fields are required')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error('New passwords do not match')
      return
    }
    changePasswordMutation.mutate()
  }

  const formatDateTime = (value?: string) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString(language === 'ms' ? 'ms-MY' : 'en-US', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const updateNotificationPreference = (key: NotificationPreferenceKey, checked: boolean) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }))
  }

  const toggleReminderDay = (day: number) => {
    setNotificationPreferences((prev) => {
      const hasDay = prev.reminderDays.includes(day)
      const reminderDays = hasDay
        ? prev.reminderDays.filter((value) => value !== day)
        : [...prev.reminderDays, day]
      return {
        ...prev,
        reminderDays: reminderDays.sort((a, b) => a - b),
      }
    })
  }

  const normalizedNotificationState = useMemo(
    () => ({
      ...notificationPreferences,
      reminderDays: [...notificationPreferences.reminderDays].sort((a, b) => a - b),
    }),
    [notificationPreferences]
  )

  const normalizedServerNotificationState = useMemo(() => {
    const source = notificationPreferencesQuery.data || DEFAULT_NOTIFICATION_PREFERENCES
    return {
      emailAgreementStatusUpdates: source.emailAgreementStatusUpdates,
      emailExpiryReminders: source.emailExpiryReminders,
      emailSignatureRequests: source.emailSignatureRequests,
      emailWitnessConfirmation: source.emailWitnessConfirmation,
      inAppAgreementStatusUpdates: source.inAppAgreementStatusUpdates,
      inAppExpiryReminders: source.inAppExpiryReminders,
      inAppSignatureRequests: source.inAppSignatureRequests,
      inAppWitnessConfirmation: source.inAppWitnessConfirmation,
      reminderDays: [...source.reminderDays].sort((a, b) => a - b),
    }
  }, [notificationPreferencesQuery.data])

  const notificationPreferencesChanged = useMemo(() => {
    return JSON.stringify(normalizedNotificationState) !== JSON.stringify(normalizedServerNotificationState)
  }, [normalizedNotificationState, normalizedServerNotificationState])

  const saveNotificationPreferences = () => {
    saveNotificationPreferencesMutation.mutate(normalizedNotificationState)
  }

  const languageHasChanges = pendingLanguage !== language

  const leftNavItems = useMemo(
    () => [
      {
        description: t('settings.languageDescription'),
        icon: <Languages className="h-4 w-4" />,
        id: 'language' as const,
        label: t('settings.languageTitle'),
      },
      {
        description: 'Control email and in-app notification channels.',
        icon: <Bell className="h-4 w-4" />,
        id: 'notifications' as const,
        label: 'Notifications',
      },
      {
        description: 'Change your account password.',
        icon: <KeyRound className="h-4 w-4" />,
        id: 'change-password' as const,
        label: 'Change password',
      },
      {
        description: 'Manage currently signed-in devices.',
        icon: <Monitor className="h-4 w-4" />,
        id: 'active-sessions' as const,
        label: 'Active sessions',
      },
      {
        description: 'Add a second authentication factor.',
        icon: <Smartphone className="h-4 w-4" />,
        id: 'two-factor' as const,
        label: 'Two-factor authentication',
      },
    ],
    [t]
  )

  const filteredNavItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return leftNavItems
    return leftNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    )
  }, [leftNavItems, searchTerm])

  const selectedPanelInfo = settingsPanels[selectedPanel]

  const renderPanelContent = () => {
    if (selectedPanel === 'language') {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant={pendingLanguage === 'en' ? 'default' : 'outline'}
              className="justify-between"
              onClick={() => setPendingLanguage('en')}
            >
              {t('settings.english')}
              {pendingLanguage === 'en' ? <Check className="h-4 w-4" /> : null}
            </Button>

            <Button
              type="button"
              variant={pendingLanguage === 'ms' ? 'default' : 'outline'}
              className="justify-between"
              onClick={() => setPendingLanguage('ms')}
            >
              {t('settings.malay')}
              {pendingLanguage === 'ms' ? <Check className="h-4 w-4" /> : null}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => saveLanguagePreferencesMutation.mutate(pendingLanguage)}
              disabled={!languageHasChanges || saveLanguagePreferencesMutation.isPending}
            >
              {saveLanguagePreferencesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save settings'
              )}
            </Button>
          </div>
        </div>
      )
    }

    if (selectedPanel === 'notifications') {
      const notificationItems: Array<{
        description: string
        emailKey: NotificationPreferenceKey
        inAppKey: NotificationPreferenceKey
        label: string
      }> = [
        {
          label: 'Signature requests',
          description: 'When you need to sign an agreement as owner or beneficiary.',
          emailKey: 'emailSignatureRequests',
          inAppKey: 'inAppSignatureRequests',
        },
        {
          label: 'Agreement status updates',
          description: 'When an agreement changes status (draft, pending, active, etc).',
          emailKey: 'emailAgreementStatusUpdates',
          inAppKey: 'inAppAgreementStatusUpdates',
        },
        {
          label: 'Witness confirmation',
          description: 'When witness verification is completed.',
          emailKey: 'emailWitnessConfirmation',
          inAppKey: 'inAppWitnessConfirmation',
        },
        {
          label: 'Expiry reminders',
          description: 'Before agreement due/expiry date.',
          emailKey: 'emailExpiryReminders',
          inAppKey: 'inAppExpiryReminders',
        },
      ]

      return (
        <div className="space-y-5">
          {notificationPreferencesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notification preferences...
            </div>
          ) : null}

          {notificationPreferencesQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load notification preferences.</p>
          ) : null}

          {!notificationPreferencesQuery.isLoading && !notificationPreferencesQuery.isError ? (
            <>
              <div className="overflow-hidden rounded-lg border border-border/70">
                <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2 border-b border-border/70 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <p>Alert type</p>
                  <p className="text-center">Email</p>
                  <p className="text-center">In-app</p>
                </div>
                {notificationItems.map((item, index) => (
                  <div
                    key={item.label}
                    className={`grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2 px-4 py-3 ${
                      index > 0 ? 'border-t border-border/70' : ''
                    }`}
                  >
                    <div className="pr-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={notificationPreferences[item.emailKey]}
                        onCheckedChange={(checked) => updateNotificationPreference(item.emailKey, Boolean(checked))}
                        aria-label={`${item.label} email notifications`}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={notificationPreferences[item.inAppKey]}
                        onCheckedChange={(checked) => updateNotificationPreference(item.inAppKey, Boolean(checked))}
                        aria-label={`${item.label} in-app notifications`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-lg border border-border/70 p-4">
                <div>
                  <p className="text-sm font-medium">Reminder timing</p>
                  <p className="text-xs text-muted-foreground">Send expiry reminders this many days before due date.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 7].map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={notificationPreferences.reminderDays.includes(day) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleReminderDay(day)}
                    >
                      {day} day{day > 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={saveNotificationPreferences}
                  disabled={!notificationPreferencesChanged || saveNotificationPreferencesMutation.isPending}
                >
                  {saveNotificationPreferencesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save notification preferences'
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )
    }

    if (selectedPanel === 'change-password') {
      return (
        <form onSubmit={onChangePassword}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
                disabled={changePasswordMutation.isPending}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: event.target.value,
                  }))
                }
                disabled={changePasswordMutation.isPending}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmNewPassword">Confirm new password</FieldLabel>
              <Input
                id="confirmNewPassword"
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmNewPassword: event.target.value,
                  }))
                }
                disabled={changePasswordMutation.isPending}
                required
              />
            </Field>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={revokeOtherSessionsOnPasswordChange}
                onCheckedChange={(checked) => setRevokeOtherSessionsOnPasswordChange(Boolean(checked))}
                disabled={changePasswordMutation.isPending}
              />
              Log out other devices after password change
            </label>
            <Button type="submit" disabled={changePasswordMutation.isPending} className="w-fit">
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </FieldGroup>
        </form>
      )
    }

    if (selectedPanel === 'active-sessions') {
      return (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={revokeOtherSessionsMutation.isPending || sessionsQuery.isPending}
              onClick={() => revokeOtherSessionsMutation.mutate()}
            >
              {revokeOtherSessionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                'Log out other devices'
              )}
            </Button>
          </div>

          {sessionsQuery.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sessions...
            </div>
          ) : null}

          {sessionsQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load active sessions.</p>
          ) : null}

          {!sessionsQuery.isPending && !sessionsQuery.isError && sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions found.</p>
          ) : null}

          {sessions.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border/70">
              {sessions.map((session: any, index: number) => {
                const isCurrentSession = Boolean(currentSessionToken && session.token === currentSessionToken)
                return (
                  <div
                    key={session.id}
                    className={`space-y-2 p-4 ${index > 0 ? 'border-t border-border/70' : ''}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        {isCurrentSession ? 'Current device' : 'Signed in device'}
                      </div>
                      {!isCurrentSession ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={revokeSessionMutation.isPending}
                          onClick={() => revokeSessionMutation.mutate(session.token)}
                        >
                          Log out
                        </Button>
                      ) : (
                        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Created: {formatDateTime(session.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">Expires: {formatDateTime(session.expiresAt)}</p>
                    {session.ipAddress ? (
                      <p className="text-xs text-muted-foreground">IP: {session.ipAddress}</p>
                    ) : null}
                    {session.userAgent ? (
                      <p className="line-clamp-2 break-words text-xs text-muted-foreground">{session.userAgent}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          2FA setup is not enabled in this deployment yet.
        </div>
        <Button type="button" variant="outline" disabled>
          Enable 2FA (Coming Soon)
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] space-y-4 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[30rem_minmax(0,1fr)] lg:items-stretch">
        <Card className="flex flex-col border-border/70 lg:min-h-[36rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>Browse and open a setting from the list.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search settings"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-border/70">
              {filteredNavItems.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No settings match your search.</div>
              ) : (
                filteredNavItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedPanel(item.id)
                      if (isMobile) {
                        setMobilePanelOpen(true)
                      }
                    }}
                    className={`flex min-h-[5.5rem] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      selectedPanel === item.id ? 'bg-primary/10' : 'hover:bg-muted/40'
                    } ${index > 0 ? 'border-t border-border/70' : ''}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hidden min-w-0 w-full flex-col overflow-hidden border-border/70 md:flex md:min-h-[36rem]">
          <CardHeader className="border-b border-border/70">
            <CardTitle>{selectedPanelInfo.title}</CardTitle>
            <CardDescription>{selectedPanelInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-6">{renderPanelContent()}</CardContent>
        </Card>
      </div>

      <Sheet open={isMobile && mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetContent
          side="right"
          className="inset-0 h-dvh w-[100dvw] max-w-[100dvw] overflow-hidden gap-0 rounded-none border-0 p-0 sm:max-w-[100dvw]"
        >
          <SheetHeader className="border-b border-border/70">
            <SheetTitle>{selectedPanelInfo.title}</SheetTitle>
            <SheetDescription>{selectedPanelInfo.description}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4">{renderPanelContent()}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
