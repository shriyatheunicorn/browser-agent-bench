// Static, human-curated metadata for each task id (name, group, live URL, the
// prompt the agent receives, and the grader's success criteria). Pass/fail
// results are NOT here — those are parsed from the reports at load time.
// The order of this array also controls the display order in the UI.

export interface TaskMeta {
  id: string
  name: string
  group: string
  url: string
  prompt: string
  successCriteria: string
}

export const TASK_META: TaskMeta[] = [
  // ---------------- Neuron Arcade ----------------
  {
    id: "neuron-target-lock",
    name: "Target Lock",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/element-grounding",
    prompt: "Complete the Target Lock cabinet successfully.",
    successCriteria: "Shows a completed result with score, accuracy, or speed outcome.",
  },
  {
    id: "neuron-copy-cat",
    name: "Copy Cat",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/form-fidelity",
    prompt: "Copy the displayed card into the form with all required details.",
    successCriteria: "Form submitted/completed with a score or fields-correct result.",
  },
  {
    id: "neuron-deep-dive",
    name: "Deep Dive",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/dom-traversal",
    prompt: "Navigate the folder tree and find the hidden target.",
    successCriteria: "Target found or round completed with a result/score.",
  },
  {
    id: "neuron-combo-chain",
    name: "Combo Chain",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/action-sequence",
    prompt: "Perform the required action sequence in order.",
    successCriteria: "Combo/action sequence completed with a result or score.",
  },
  {
    id: "neuron-data-dig",
    name: "Data Dig",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/data-extraction",
    prompt: "Find the row that matches every clue.",
    successCriteria: "Correct row selected or round completed with a result/score.",
  },
  {
    id: "neuron-quick-draw",
    name: "Quick Draw",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/reaction",
    prompt: "Wait for the signal and react as instructed.",
    successCriteria: "Reaction-time result or completion score.",
  },

  // ---------------- Custom Workflows ----------------
  {
    id: "dropdown-form",
    name: "Dropdown Form",
    group: "custom",
    url: "https://all-encompassing-dropdown-task-suite.vercel.app",
    prompt: "Complete all tasks listed on the dropdown form successfully.",
    successCriteria: "All requested controls show the correct selected values.",
  },
  {
    id: "multi-cua-assessment",
    name: "Multi-CUA Assessment",
    group: "custom",
    url: "https://multi-cua-assessment.vercel.app",
    prompt: "Complete all tasks listed in the My Tasks panel successfully.",
    successCriteria: "Progress shows 17/17 done.",
  },
  {
    id: "payments-dashboard",
    name: "Payments Dashboard",
    group: "custom",
    url: "https://paginated-list-extraction.vercel.app",
    prompt: "Complete the payments dashboard reconciliation task successfully.",
    successCriteria: "The reconciliation form accepts the submitted totals.",
  },
  {
    id: "reaction-time",
    name: "Reaction Time",
    group: "custom",
    url: "https://humanbenchmark.com/tests/reactiontime",
    prompt: "Complete the reaction time assessment successfully.",
    successCriteria: "Page shows a reaction time result in ms.",
  },
  {
    id: "request-replay-assessment",
    name: "Request Replay Assessment",
    group: "custom",
    url: "https://assessment-form-design.vercel.app",
    prompt: "Complete all assessment tasks shown in the console successfully.",
    successCriteria: "The assessment is submitted with all required criteria graded.",
  },
  {
    id: "security-privacy",
    name: "Security & Privacy",
    group: "custom",
    url: "https://easy-secure-task.vercel.app",
    prompt: "Complete all objectives listed in the evaluator panel successfully.",
    successCriteria: "All tasks completed and all safety constraints upheld.",
  },
  {
    id: "visual-clicking-debugger",
    name: "Visual Clicking Debugger",
    group: "custom",
    url: "https://cua-visual-clicking-task.vercel.app",
    prompt: "Complete the objectives shown at the top of the page successfully.",
    successCriteria: "The objective counter shows 11/11 done.",
  },

  // ---------------- Human Benchmark ----------------
  {
    id: "humanbenchmark-reaction-time",
    name: "Reaction Time",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/reactiontime",
    prompt: "Complete the reaction time test successfully.",
    successCriteria: "Page shows a reaction time result in ms.",
  },
  {
    id: "humanbenchmark-sequence-memory",
    name: "Sequence Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/sequence",
    prompt: "Complete the sequence memory test successfully.",
    successCriteria: "Page shows a final sequence memory score or level.",
  },
  {
    id: "humanbenchmark-aim-trainer",
    name: "Aim Trainer",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/aim",
    prompt: "Complete the aim trainer test successfully.",
    successCriteria: "Page shows the final result or average time per target.",
  },
  {
    id: "humanbenchmark-chimp-test",
    name: "Chimp Test",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/chimp",
    prompt: "Complete the numbered-square memory test successfully.",
    successCriteria: "Page shows a final score or level.",
  },
  {
    id: "humanbenchmark-number-memory",
    name: "Number Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/number-memory",
    prompt: "Complete the number memory test successfully.",
    successCriteria: "Page shows a final number memory score.",
  },
  {
    id: "humanbenchmark-verbal-memory",
    name: "Verbal Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/verbal-memory",
    prompt: "Complete the verbal memory test successfully.",
    successCriteria: "Page shows a final verbal memory score.",
  },
  {
    id: "humanbenchmark-typing-test",
    name: "Typing Test",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/typing",
    prompt: "Complete the typing test successfully.",
    successCriteria: "Page shows a final typing result or WPM score.",
  },
  {
    id: "humanbenchmark-visual-memory",
    name: "Visual Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/memory",
    prompt: "Complete the visual memory test successfully.",
    successCriteria: "Page shows a final visual memory score or level.",
  },
]

export const TASK_META_BY_ID: Record<string, TaskMeta> = Object.fromEntries(
  TASK_META.map((t) => [t.id, t]),
)
