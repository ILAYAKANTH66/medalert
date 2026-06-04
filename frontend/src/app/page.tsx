import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Shield,
  Bell,
  Users,
  ChevronRight,
  CheckCircle,
  Phone,
  BarChart3,
  Smartphone,
  Zap,
  Star,
} from "lucide-react";

const features = [
  {
    icon: <Zap className="h-5 w-5 text-teal-600" />,
    title: "Smart Reminders",
    desc: "Receive a gentle nudge, a persistent alert, and a phone call if you miss a dose.",
  },
  {
    icon: <Bell className="h-5 w-5 text-indigo-600" />,
    title: "Reliable Background Alerts",
    desc: "Receive reminders even when the app is closed or your screen is locked.",
  },
  {
    icon: <Shield className="h-5 w-5 text-emerald-600" />,
    title: "Secure Caretaker Access",
    desc: "Read-only monitoring via token. Caretakers cannot edit medicines or log doses.",
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-violet-600" />,
    title: "Adherence Analytics",
    desc: "7-day charts, timelines, refill predictions, and real-time dashboard insights.",
  },
];

const testimonials = [
  { quote: "The phone call reminders give my family peace of mind when I travel.", author: "Priya S.", role: "Patient" },
  { quote: "I monitor three patients from one caretaker dashboard — zero confusion.", author: "James M.", role: "Caretaker" },
  { quote: "An elegant and reliable platform for our patients.", author: "Dr. Chen", role: "Clinic pilot" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] overflow-x-hidden">
      <nav className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-600/20">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">MedAlert</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--text-secondary)]">
            <a href="#features" className="hover:text-teal-700 transition-colors">Features</a>
            <a href="#escalation" className="hover:text-teal-700 transition-colors">Escalation</a>
            <a href="#caretaker" className="hover:text-teal-700 transition-colors">Caretaker</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-semibold">Login</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="font-bold rounded-xl shadow-md shadow-teal-600/15 px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-indigo-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-teal-400/10 blur-[100px] pointer-events-none" />
        <div className="relative mx-auto max-w-4xl text-center flex flex-col items-center gap-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-teal-50 px-4 py-1.5 text-xs font-bold text-teal-800">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
            Premium Healthcare Platform
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.1]">
            Medicine reminders that{" "}
            <span className="bg-gradient-to-r from-teal-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              ensure you stay safe
            </span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed font-medium">
            MedAlert provides reliable medicine reminders with intelligent phone call follow-ups, and a dedicated monitoring dashboard for your caretakers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button className="gap-2 h-12 px-8 rounded-xl text-base font-bold shadow-xl shadow-teal-600/20">
                Start free <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-12 px-8 rounded-xl text-base font-bold">
                View demo dashboard
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {["Secure Access", "Reliable Reminders", "Voice Calls", "Works Offline"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-[var(--text-primary)]">Built for adherence, not alerts only</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className="group p-6 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-1 transition-all duration-300">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 w-fit mb-4 group-hover:scale-105 transition-transform">{f.icon}</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="escalation" className="bg-slate-900 text-white py-20 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Phone calls when silence is risky</h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              If you don&apos;t acknowledge a dose within your configured window, MedAlert places an automated call:
              <em className="text-white block mt-2 not-italic font-medium">&quot;Hello. This is MedAlert. It is time to take your medicine.&quot;</em>
            </p>
            <ul className="space-y-3 text-sm">
              {["Initial reminder at dose time", "Follow-up notification if missed", "Automated phone call for critical doses"].map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-teal-400 shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-teal-600/20 to-indigo-600/20 border border-white/10 p-8 backdrop-blur">
            <Smartphone className="h-12 w-12 text-teal-400 mb-4" />
            <p className="text-lg font-semibold">Notification Center</p>
            <p className="text-slate-400 text-sm mt-2">Configure delays, silent mode, test calls, and per-channel toggles from Settings.</p>
          </div>
        </div>
      </section>

      <section id="caretaker" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-8 md:p-12 shadow-[var(--shadow-md)] flex flex-col md:flex-row gap-8 items-center">
          <Users className="h-16 w-16 text-violet-600 shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Caretaker monitoring</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Link via patient token. Caretakers see dashboards, timelines, and refill alerts — with strict read-only enforcement on frontend and backend.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">Trusted by patients & families</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <blockquote key={i} className="p-6 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm text-[var(--text-secondary)] italic mb-4">&ldquo;{t.quote}&rdquo;</p>
              <footer className="text-xs font-bold text-[var(--text-primary)]">{t.author} · {t.role}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-teal-600 to-indigo-600 py-16 px-6 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready for your next dose?</h2>
        <p className="text-teal-50 mb-8 max-w-lg mx-auto">Install the app. Customize your reminders. Never miss critical medication again.</p>
        <Link href="/signup">
          <Button size="lg" variant="secondary" className="font-bold h-12 px-10 rounded-xl bg-white text-teal-800 hover:bg-teal-50">
            Create free account
          </Button>
        </Link>
      </section>

      <footer className="border-t border-[var(--border-subtle)] py-10 px-6 text-center text-sm text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text-secondary)]">MedAlert © {new Date().getFullYear()}</p>
        <p className="mt-1">Healthcare adherence platform built for real families</p>
      </footer>
    </main>
  );
}
