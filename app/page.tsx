import { Dashboard } from "@/components/dashboard"
import { loadBenchData } from "@/lib/report-loader"

// Re-read the reports on every request so committing fresh runs updates the UI.
export const dynamic = "force-dynamic"

export default async function Page() {
  const { tasks, models, generatedAt, sourceFile } = await loadBenchData()
  return <Dashboard tasks={tasks} models={models} generatedAt={generatedAt} sourceFile={sourceFile} />
}
