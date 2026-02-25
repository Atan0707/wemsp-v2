import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, Users2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/landing-preview')({
  component: LandingPreviewPage,
})

const processSteps = [
  {
    title: 'Profile and family setup',
    description: 'Capture owner details, beneficiary structure, and legal preferences in a guided flow.',
  },
  {
    title: 'Asset and agreement drafting',
    description: 'Generate a legally structured agreement with a clear breakdown of assets and intentions.',
  },
  {
    title: 'Signature and final records',
    description: 'Coordinate owner, beneficiary, and witness signatures with real-time completion status.',
  },
]

const strengths = [
  {
    icon: ShieldCheck,
    title: 'Legally structured workflow',
    text: 'Clear sequence from preparation to execution without disconnected tools.',
  },
  {
    icon: Users2,
    title: 'Designed for families',
    text: 'Readable language and predictable steps for every participant in the process.',
  },
  {
    icon: FileText,
    title: 'Execution-ready output',
    text: 'Produce complete, signable records with status transparency at every stage.',
  },
]

function LandingPreviewPage() {
  return (
    <main className="min-h-screen bg-[#d8d1c6] px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1120px] rounded-[34px] border border-[#d2c9bc] bg-[#f5f1ea] p-4 shadow-[0_30px_80px_-40px_rgba(46,33,17,0.45)] md:p-6">
        <header className="mb-4 flex items-center justify-between rounded-2xl border border-[#e2d9ca] bg-[#fbf8f3] px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/assets/logo2.png" alt="WEMSP logo" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#2f271e]">WEMSP</p>
              <p className="text-xs text-[#6f6251]">Wasiyyah Estate Management System Platform</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-xs text-[#6f6251] md:flex">
            <a href="#about" className="hover:text-[#2f271e]">Who we are</a>
            <a href="#process" className="hover:text-[#2f271e]">Process</a>
            <a href="#why" className="hover:text-[#2f271e]">Why WEMSP</a>
          </nav>
          <Button className="h-9 rounded-xl bg-[#7b613d] px-4 text-xs text-white hover:bg-[#6d5535]">Contact us</Button>
        </header>

        <section className="relative overflow-hidden rounded-[24px] border border-[#d9cfbf] bg-[#e6ddd1]">
          <img src="/assets/sharia-court.jpg" alt="WEMSP visual" className="h-[430px] w-full object-cover md:h-[500px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/58 via-black/28 to-black/10" />

          <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-7">
            <div className="flex justify-end">
              <div className="rounded-xl border border-white/30 bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm">
                Guided digital estate workflow
              </div>
            </div>

            <div className="grid items-end gap-6 lg:grid-cols-[1fr_360px]">
              <div>
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                  Bringing simplicity to modern wasiyyah planning
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
                  Prepare and execute estate agreements in a calm, guided experience built for families, advisors, and witnesses.
                </p>
              </div>

              <div className="rounded-2xl border border-white/25 bg-white/18 p-4 backdrop-blur-md md:p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-white/85">Complete process</p>
                <p className="mt-2 text-sm leading-relaxed text-white">
                  From profile setup to signature completion, every step stays connected in one clear workflow.
                </p>
                <Button className="mt-4 h-9 w-full rounded-lg bg-white text-sm text-[#2f271e] hover:bg-[#f2ebe2]">
                  Start your planning journey
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[20px] border-[#ddd3c4] bg-[#efe4d2]">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8b7b66]">Platform summary</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-3xl font-semibold text-[#3a2f22]">150+</p>
                  <p className="text-xs text-[#726552]">Families onboarded</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-[#3a2f22]">15+</p>
                  <p className="text-xs text-[#726552]">States coverage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[20px] border-[#ddd3c4] bg-[#fbf8f3]">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#8b7b66]">Who we are</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#2f271e]">A dependable estate workflow for families and advisors</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#625846]">
                  WEMSP turns legal complexity into a guided digital path that feels clear, respectful, and controlled.
                </p>
              </div>
              <img src="/assets/background-islamic.png" alt="Decorative motif" className="h-40 w-full rounded-2xl object-cover" />
            </CardContent>
          </Card>
        </section>

        <section id="process" className="mt-5 rounded-[24px] border border-[#ddd3c4] bg-[#fbf8f3] p-5 md:p-6">
          <h3 className="text-3xl font-semibold leading-tight text-[#2f271e]">How we simplify your estate preparation</h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-3">
              {processSteps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-[#e8dece] bg-white p-4">
                  <p className="text-xs font-medium text-[#8b7b66]">Step {index + 1}</p>
                  <p className="mt-1 text-base font-semibold text-[#2f271e]">{step.title}</p>
                  <p className="mt-1 text-sm text-[#655a48]">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-[#e2d8c9] bg-[#f0e6d6]">
              <img src="/assets/background-islamic.png" alt="Islamic pattern" className="h-full min-h-[300px] w-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f1810]/65 via-[#3d3121]/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/25 bg-white/20 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-white/90">Process note</p>
                <p className="mt-1 text-sm leading-relaxed text-white">
                  Progress states are visible for owner, beneficiary, and witness actions from draft to finalized record.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="mt-5 grid gap-4 md:grid-cols-3">
          {strengths.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="rounded-2xl border-[#ddd3c4] bg-[#fbf8f3]">
              <CardContent className="p-5">
                <div className="inline-flex rounded-lg bg-[#f0e6d6] p-2 text-[#654f31]">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-lg font-semibold text-[#2f271e]">{title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-[#655a48]">{text}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-[#7a6b57]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#6f9b6a]" />
                  <span>Aligned with real legal process expectations</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
