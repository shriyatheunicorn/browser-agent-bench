# Latest Browserbase vs Browser Use vs Browserless Results

Generated at: 2026-06-26T20:27:00.586Z
Latest result folder timestamp: 2026-06-26T18:11:32.553Z
Results source: `../results`

This report uses the newest available row for each provider/model/task/trial from local `results.jsonl` files.
The side-by-side summary includes only tasks that have rows for every active provider for the same model.
126 provider-only latest row(s) were omitted from the side-by-side comparison.

## Per-Model Summary

| Model | Browserbase | Browserbase data | Browser Use | Browser Use data | Browserless | Browserless data | Browserbase - Browser Use |
| --- | ---: | --- | ---: | --- | ---: | --- | ---: |
| openai/gpt-5.4-mini | 8/21 (38.1%), avg 144.4s | 1 run(s), latest 2026-06-26T18:11:32.553Z, running:13 completed:8 | 13/21 (61.9%), avg 127.2s, cost $2.466 | 1 run(s), latest 2026-06-26T12:00:00.000Z, stopped:15 running:6 | 7/21 (33.3%), avg 16.4s | 1 run(s), latest 2026-06-26T18:11:32.553Z, completed:21 | -23.8 pp |

## Task Detail

| Model | Task | Browserbase | Browserbase result | Browser Use | Browser Use result | Browserless | Browserless result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| openai/gpt-5.4-mini | dropdown-form | fail, running, 183.9s |  | fail, running, 180.3s |  | fail, completed, 20.5s |  |
| openai/gpt-5.4-mini | multi-cua-assessment | fail, running, 183.6s |  | fail, running, 184.0s |  | fail, completed, 5.9s |  |
| openai/gpt-5.4-mini | payments-dashboard | pass, completed, 180.2s | completed | fail, stopped, 108.1s | Correct. Every transaction was accounted for. | fail, completed, 4.0s |  |
| openai/gpt-5.4-mini | reaction-time | pass, completed, 57.4s | 9568 ms | pass, stopped, 91.9s | 14397 ms | pass, completed, 29.4s | 4269 ms |
| openai/gpt-5.4-mini | request-replay-assessment | fail, running, 182.6s |  | fail, running, 183.7s |  | fail, completed, 3.4s |  |
| openai/gpt-5.4-mini | security-privacy | fail, running, 181.4s |  | fail, running, 184.2s |  | fail, completed, 5.2s |  |
| openai/gpt-5.4-mini | visual-clicking-debugger | fail, running, 183.3s |  | pass, stopped, 122.1s | 11/11 DONE | fail, completed, 3.3s |  |
| openai/gpt-5.4-mini | neuron-combo-chain | pass, completed, 54.8s | 0/4 | pass, stopped, 51.2s | clean | pass, completed, 4.1s |  |
| openai/gpt-5.4-mini | neuron-copy-cat | fail, running, 180.3s |  | pass, stopped, 129.5s | CLEARED! FIELDS CORRECT 9/9 FIDELITY 100% ERRORS 0 | pass, completed, 115.0s | PLAY AGAIN |
| openai/gpt-5.4-mini | neuron-data-dig | pass, completed, 60.9s | completed | pass, stopped, 66.2s | CLEARED! EXTRACTED VALUE $840,237 WRONG CELLS 0 ROWS SCANNED 11 TIME 7.8s | pass, completed, 6.8s |  |
| openai/gpt-5.4-mini | neuron-deep-dive | pass, completed, 50.3s | completed | pass, stopped, 159.0s | CLEARED! | pass, completed, 87.8s |  |
| openai/gpt-5.4-mini | neuron-quick-draw | pass, completed, 110.4s | 5/5 | pass, stopped, 45.3s | CLEARED! | pass, completed, 6.1s |  |
| openai/gpt-5.4-mini | neuron-target-lock | pass, completed, 90.5s | 5962ms | pass, stopped, 128.9s | CLEARED! GROUNDING ACCURACY 100% HITS 8/8 | pass, completed, 22.8s | CLEARED! |
| openai/gpt-5.4-mini | humanbenchmark-aim-trainer | fail, running, 183.0s |  | pass, stopped, 71.6s | Average time per target 121ms | fail, completed, 3.9s |  |
| openai/gpt-5.4-mini | humanbenchmark-chimp-test | fail, running, 181.7s |  | fail, running, 185.6s |  | fail, completed, 3.7s |  |
| openai/gpt-5.4-mini | humanbenchmark-number-memory | fail, running, 183.0s |  | fail, running, 184.4s |  | fail, completed, 3.2s |  |
| openai/gpt-5.4-mini | humanbenchmark-reaction-time | pass, completed, 54.6s | 7704 ms | pass, stopped, 153.3s | 17946 ms | fail, completed, 3.7s |  |
| openai/gpt-5.4-mini | humanbenchmark-sequence-memory | fail, running, 183.8s |  | pass, stopped, 112.4s | Level:4 | fail, completed, 3.7s |  |
| openai/gpt-5.4-mini | humanbenchmark-typing-test | fail, running, 183.7s |  | pass, stopped, 101.7s | 668wpm | fail, completed, 3.0s |  |
| openai/gpt-5.4-mini | humanbenchmark-verbal-memory | fail, running, 183.0s |  | fail, stopped, 50.2s | 2 words | fail, completed, 4.2s |  |
| openai/gpt-5.4-mini | humanbenchmark-visual-memory | fail, running, 180.2s |  | pass, stopped, 177.5s | Level 1 | fail, completed, 4.0s |  |
