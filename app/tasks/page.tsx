import { TaskExplorer } from "@/components/task-explorer"

export const metadata = {
  title: "Try the Tasks — Browserbase Bench",
  description: "Interact with the live browser-agent benchmark tasks yourself.",
}

export default function TasksPage() {
  return <TaskExplorer />
}
