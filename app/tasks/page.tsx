import { TaskExplorer } from "@/components/task-explorer"
import { loadBenchData } from "@/lib/report-loader"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Try the Tasks — Browserbase Bench",
  description: "Interact with the live browser agent benchmark tasks yourself.",
}

export default async function TasksPage() {
  const { tasks, models } = await loadBenchData()
  return <TaskExplorer tasks={tasks} models={models} />
}
