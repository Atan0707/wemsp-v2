import { createFileRoute } from '@tanstack/react-router'
import { Check, Languages } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/lib/i18n/context'

export const Route = createFileRoute('/app/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { language, setLanguage, t } = useLanguage()

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
    </div>
  )
}
