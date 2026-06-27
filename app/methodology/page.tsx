import Link from "next/link"
import { ArrowUpRight, ShieldCheck, FileSearch, Lock, Repeat, BookOpen, ChevronDown } from "lucide-react"

export const metadata = {
  title: "Methodology — Browserbase Bench",
  description:
    "Why this browser agent benchmark is verifiable and reproducible: externally checkable success conditions, deterministic graders, and inspectable artifacts.",
}

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Methodology</span>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Verifiable <span className="bb-mark">by construction</span>
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          This browser agent task set is designed to be{" "}
          <span className="font-medium text-foreground">100% verifiable</span> in the practical and reproducible sense:
          every task has an externally checkable success condition, a deterministic grader, and inspectable artifacts,
          so the benchmark does not need to trust an agent&apos;s self-report or an LLM judge.
        </p>
      </header>

      {/* In-short callout */}
      <aside className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">In short</span>
        </div>
        <p className="mt-3 text-pretty leading-relaxed text-foreground">
          This framework is reliable because it converts web-agent behavior into varied, independent, and checkable
          evidence. It is reproducible because the tasks, graders, provider configs, raw artifacts, and reports are all
          explicit.
        </p>
      </aside>

      <div className="mt-12 flex flex-col gap-12">
        {/* Core principle */}
        <Section icon={FileSearch} title="The core principle">
          <p>
            Success is tied to structured evidence: selected dropdown values, visible scores, counters, completion
            states, exact text, run logs, and saved provider artifacts. The guiding rule is simple —{" "}
            <span className="font-medium text-foreground">
              the agent may act freely, but the evaluator only scores independently recoverable evidence
            </span>
            .
          </p>
          <p>
            This follows the direction of current verifier research: reliable computer-use evaluation requires more than
            a final answer. It needs task-specific criteria, clear separation of process and outcome, and deterministic
            trajectory inspection.{" "}
            <em>The Art of Building Verifiers for Computer Use Agents</em> argues that CUA evaluation depends on
            meaningful rubrics, process/outcome separation, controllable-vs-uncontrollable failure analysis, and
            attention to full screenshot/action evidence, because final claims alone are not trustworthy.
          </p>
          <p>
            The most direct evidence is the Berkeley RDI study by Wang, Mang, Cheung, Sen, and Song (April 2026),{" "}
            <em>How We Broke Top AI Agent Benchmarks</em>. The authors built an automated exploit agent and drove eight
            of the field&apos;s most cited agent benchmarks — including SWE-bench Verified, SWE-bench Pro, WebArena,
            OSWorld, GAIA, and Terminal-Bench — to near-perfect scores{" "}
            <span className="font-medium text-foreground">without solving a single task</span>, in most cases without
            making a single model call. A ten-line <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">conftest.py</code>{" "}
            &ldquo;resolves&rdquo; every SWE-bench Verified instance, and a one-character message (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{"{}"}</code>) scores 100% on all 890
            FieldWorkArena tasks — because its validator only checks that the last message came from the assistant.
            Navigating Chromium to a <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">file://</code>{" "}
            URL reads WebArena&apos;s gold answers straight off disk.
          </p>
        </Section>

        {/* Task Design */}
        <Section icon={ShieldCheck} title="Task design">
          <p>
            A task passes only if the grader finds the expected observable state: for example, exact dropdown
            selections, <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">11/11</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">8/8</code>, a reaction-time{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">ms</code> value, a cleared game state,
            or a required completion message. That makes the benchmark closer to an evidence-chain evaluation than a
            simple accuracy leaderboard.{" "}
            <a
              href="https://arxiv.org/html/2605.08888v1"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              DocScope
            </a>{" "}
            makes the same methodological point — that answer accuracy alone cannot substitute for trajectory-level
            evaluation, and even correct answers often lack complete evidence chains.
          </p>
        </Section>

        {/* Against evaluation hacking */}
        <Section icon={Lock} title="Designed against evaluation hacking">
          <p>
            The task metadata and expected answers live in the harness, not in the browser page the agent is solving.
            Grading happens after the run from recorded outputs and artifacts, and the result is computed by code rather
            than by agent-provided success claims. To be fully armored against reward hacking, the evaluator is isolated
            from the system under test, reference answers are not visible to the agent, and reward is computed from
            declared artifacts in an environment the agent cannot mutate.
          </p>
        </Section>

        {/* Reproducibility */}
        <Section icon={Repeat} title="Reproducibility through standardization">
          <p>
            Reproducibility comes from standardization: the same{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">tasks.json</code>, same provider
            matrix, same model labels, same timeout settings, same raw{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">results.jsonl</code>, and same report
            generator can be rerun across Browserbase, Browser Use, and Browserless. This follows the spirit of
            SWE-Marathon, which uses unique executable environments, human-written reference solutions, multi-layer
            verification, adversarial review, and released trajectories to make long-horizon agent evaluation more
            robust.
          </p>
        </Section>
      </div>

      <div className="mt-14 rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold tracking-tight">See it for yourself</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Every task in the suite is a live environment you can open and inspect. The same prompts and success conditions
          the agents are graded on are available to try.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Try the tasks <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            View the benchmark
          </Link>
        </div>
      </div>

      <details className="group mt-6 rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              <BookOpen className="h-4 w-4 text-primary" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Sources</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <ol className="flex flex-col gap-4 border-t border-border px-6 py-5 text-sm leading-relaxed text-muted-foreground">
          {SOURCES.map((s) => (
            <li key={s.href} className="flex flex-col gap-0.5">
              <span>
                {s.citation}{" "}
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-medium text-primary underline underline-offset-4 hover:no-underline"
                >
                  {s.href}
                </a>
              </span>
            </li>
          ))}
        </ol>
      </details>
    </main>
  )
}

const SOURCES = [
  {
    citation:
      "Bordes, F., et al. (2025). Eval Factsheets: A Structured Framework for Documenting AI Evaluations. arXiv:2512.04062.",
    href: "https://arxiv.org/abs/2512.04062",
  },
  {
    citation: "Desai, R. (2026). Designing eval harnesses that prevent reward hacking.",
    href: "https://www.rishidesai.org/posts/task-design/",
  },
  {
    citation:
      "Desai, R., et al. (2026). SWE-Marathon: Can Agents Autonomously Complete Ultra-Long-Horizon Software Work? arXiv:2606.07682.",
    href: "https://www.swe-marathon.org/",
  },
  {
    citation:
      "Feng, X., et al. (2026). DocScope: Benchmarking Verifiable Reasoning for Trustworthy Long-Document Understanding. arXiv:2605.08888.",
    href: "https://arxiv.org/html/2605.08888v1",
  },
  {
    citation:
      "Rosset, C., Sharma, P., Zhao, A., Gonzalez-Fernandez, M., & Awadallah, A. (2026). The Art of Building Verifiers for Computer Use Agents. arXiv:2604.06240.",
    href: "https://arxiv.org/abs/2604.06240",
  },
  {
    citation:
      "Wang, H., Mang, Q., Cheung, A., Sen, K., & Song, D. (2026). How We Broke Top AI Agent Benchmarks: And What Comes Next. Berkeley RDI.",
    href: "https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/",
  },
  {
    citation: "Browserbase Bench. Verifiable browser agent benchmark.",
    href: "https://browser-agent-bench.vercel.app/",
  },
]

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="mt-4 flex flex-col gap-4 text-pretty leading-relaxed text-muted-foreground [&_em]:text-foreground [&_em]:not-italic [&_em]:font-medium">
        {children}
      </div>
    </section>
  )
}
