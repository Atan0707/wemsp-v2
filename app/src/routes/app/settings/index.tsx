import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Languages, Loader2, Lock, Shield, Smartphone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { useLanguage } from '@/lib/i18n/context'

export const Route = createFileRoute('/app/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { language, setLanguage, t } = useLanguage()
  const queryClient = useQueryClient()
  const [revokeOtherSessionsOnPasswordChange, setRevokeOtherSessionsOnPasswordChange] = useState(true)
  const [passwordForm, setPasswordForm] = useState({
    confirmNewPassword: '',
    currentPassword: '',
    newPassword: '',
  })
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

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('settings.languageTitle')}
          </CardTitle>
          <CardDescription>{t('settings.languageDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant={language === 'en' ? 'default' : 'outline'}
            className="justify-between"
            onClick={() => setLanguage('en')}
          >
            {t('settings.english')}
            {language === 'en' ? <Check className="h-4 w-4" /> : null}
          </Button>

          <Button
            type="button"
            variant={language === 'ms' ? 'default' : 'outline'}
            className="justify-between"
            onClick={() => setLanguage('ms')}
          >
            {t('settings.malay')}
            {language === 'ms' ? <Check className="h-4 w-4" /> : null}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Account & Security
          </CardTitle>
          <CardDescription>Manage your password, active sessions, and security controls.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your login password and optionally log out other devices.</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Button type="submit" disabled={changePasswordMutation.isPending}>
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
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Review where your account is signed in and remove sessions you do not recognize.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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

          {sessions.map((session: any) => {
            const isCurrentSession = Boolean(currentSessionToken && session.token === currentSessionToken)
            return (
              <div key={session.id} className="space-y-2 rounded-lg border border-border/70 p-3">
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
                  <p className="line-clamp-2 text-xs text-muted-foreground">{session.userAgent}</p>
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>Add a second verification step for better account protection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            2FA setup is not enabled in this deployment yet.
          </div>
          <Button type="button" variant="outline" disabled>
            Enable 2FA (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
