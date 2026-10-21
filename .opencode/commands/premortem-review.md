---
description: Run an evidence-based SnapShelf technical pre-mortem
---

First load the `pre-mortem` skill using the skill tool.

Then conduct a technical pre-mortem of SnapShelf, following the loaded skill's methodology and references.

Target or milestone being stress-tested:

$ARGUMENTS

Assume this target was released and, 14 days later, it failed badly enough
that we regret shipping it.

Before generating risks, inspect the repository.

Use repository evidence whenever possible. Inspect relevant:

- AGENTS.md
- README/project documentation
- package.json and dependency configuration
- architecture
- application state
- persistence and local storage
- image/media handling
- filesystem behavior
- permissions
- authentication/authorization if present
- APIs and external services
- privacy boundaries
- tests
- error handling
- build/release configuration
- TODO/FIXME comments
- recent changes

Current working-tree state:

!`git status --short`

Recent development history:

!`git log --oneline -10`

For each important finding explicitly label the basis as:

- EVIDENCE
- INFERENCE
- UNKNOWN

Do not treat hypothetical risks as proven facts.

Investigate risks across:

- architecture
- data/storage
- filesystem/media
- security
- privacy
- reliability
- AI/agent behavior where applicable
- UX
- testing
- dependencies
- deployment
- maintainability
- product assumptions

Use the Tiger / Paper Tiger / Elephant methodology from the pre-mortem skill.

For Tigers, assign:

- Launch-Blocking
- Fast-Follow
- Track

For every Launch-Blocking Tiger provide:

- concrete risk
- repository evidence
- plausible failure scenario
- mitigation
- verification method
- owner/owner role
- decision condition

Use Solo Developer Mode unless repository/project context clearly indicates a
team session.

Do not edit the application while performing this analysis.

Finish with:

## Launch Recommendation

Choose exactly one:

- GO
- CONDITIONAL GO
- NO-GO

Then list:

1. Launch blockers
2. Conditions for launch
3. Fast-follow work
4. Risks to monitor
5. Unknowns requiring validation

If I explicitly ask to save the analysis, write it under:

docs/pre-mortems/

using a descriptive YYYY-MM-DD-prefixed Markdown filename.
