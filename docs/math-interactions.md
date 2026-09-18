# Math question interaction plan

Use the prepared `content/math/unit 1/lesson_1.md` through `lesson_8.md` as the source of truth. Keep question IDs and attempts on import reruns. Grade on the server; never send solutions inside interaction metadata.

| Source task | Interaction |
| --- | --- |
| L1 Q1: underline, circle, square | Move three labelled shape markers onto individual digit positions; repeated digits remain distinguishable. |
| L1 Q4: place-value table | Reusable digit tiles and labelled place-value slots, including zero and empty leading places. |
| Identify a digit in a place | Select the digit directly in the displayed number. |
| Smallest/greatest number | Arrange the supplied digit tiles, using each exactly once. |
| Expanded / decomposed forms | Fill coefficients in place-value terms, including zero; server validates every place. |
| Reading / word form | Arrange phrase cards in reading order. |
| L5–6: comparisons | Place `<`, `=`, or `>` between the two expressions. |
| Missing digit | Fill the square using a digit tile; accept every digit satisfying the inequality. |
| L7: ordering | Arrange number cards; retain original word/expanded forms where requested. |
| L8: rounding | Label the midpoint and choose a rounding endpoint on a number line. |
| Open number problems | Separate labelled fields; validate mathematical conditions rather than one example answer. |
| Existing multiple choice | Large readable choices with source formatting retained. |
| Short calculations | Numeric fields with grouping, Arabic-digit support, and readable LTR math. |
| Reasoning | Explicit unscored reflection with the source explanation after submission. |
| L1 Q6: unreadable source underlines | Hold for content review; do not invent the missing markings. |

Split all lettered worksheet parts (a–z), show one task at a time, retain the shared prompt, and render source tables as tables. Drag targets also accept tap-to-select/tap-to-place and keyboard activation. Save drafts, provide immediate feedback, show progress and a session streak, and allow review of missed work without erasing earlier scores.

Repair the permanent Math lesson cap while retaining normal sequential prerequisites. Pick an accessible lesson on the subject training screen. Use the same saved activity API for Math lesson questions, quiz, and targeted practice, with useful Arabic errors and retry/back controls.

Validation: source-wide import coverage and repeatability, answer privacy, correct/incorrect interaction submissions, alternative valid answers, prerequisite access, progress persistence, frontend interaction-state tests, TypeScript and production build.
