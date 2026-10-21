---
name: pre-mortem
description: >
  Pre-mortem risk analysis expert that classifies risks as Tigers, Paper Tigers,
  and Elephants to surface launch-blocking issues before they happen.
license: MIT + Commons Clause
metadata:
  version: "1.0.1"
  author: "borghei"
  category: "project-management"
  domain: "product-discovery"
  updated: "2026-06-15"
  python-tools: "risk_categorizer.py"
  tech-stack: "pre-mortem, risk-analysis, gary-klein, prospective-hindsight"
---
# Pre-Mortem Risk Analysis Expert

## Overview

A pre-mortem is a prospective hindsight exercise: imagine that your product has launched and failed, then work backward to identify why. This skill uses the Tiger / Paper Tiger / Elephant classification to categorize risks by type and urgency, ensuring launch-blocking issues are addressed before launch while avoiding wasted effort on unlikely risks.

## Core Capabilities

- **Prospective hindsight framing** — "It is 14 days after launch, and we failed. Why?" surfaces specific, honest risks.
- **Tiger / Paper Tiger / Elephant classification** — separate real evidenced risks (Tigers) from anxiety (Paper Tigers) and unspoken concerns (Elephants).
- **Urgency triage** — tag each Tiger Launch-Blocking, Fast-Follow, or Track with owner and decision date.
- **6-phase facilitation** — scene-setting, silent generation, cluster, classify, mitigate, address elephants in 60-90 minutes.
- **Automated categorization** — `risk_categorizer.py` summarizes distribution and flags elephants needing escalation.

## When to Use

- Before committing significant resources to build (post-ideation, post-validation).
- Before a major launch, migration, or architectural change.
- When the team has "a bad feeling" they cannot articulate.
- When stakeholder confidence is high and you need to stress-test it.

## Clarify First

Before running the pre-mortem, confirm these inputs. If any is unknown or vague, ASK — do not assume:

- [ ] **The thing being stress-tested** — the specific launch/build/migration that "failed 14 days after launch" (anchors the prospective-hindsight framing)
- [ ] **Failure horizon** — the date/milestone you imagine looking back from (a vague horizon produces vague risks)
- [ ] **Who's in the room** — the 4-8 participants and whether psychological safety exists (elephants only surface with candor and the right people)

Stop rule: ask only the 2-3 that most change the output. If the user says "just draft it," proceed and list your assumptions at the top of the artifact.

## Quick Start

```bash
python3 scripts/risk_categorizer.py --demo            # built-in sample (7 risks)
python3 scripts/risk_categorizer.py input.json        # categorize your risks
python3 scripts/risk_categorizer.py input.json --format json
```

Each risk needs `description`, `category` (`tiger`/`paper_tiger`/`elephant`), `evidence`, and `urgency` (`launch_blocking`/`fast_follow`/`track`) for tigers. Document the session with `assets/pre_mortem_template.md`.

## References

Load the reference that matches the task — keep this file lean and pull detail on demand:

- **[references/methodology-and-tools.md](references/methodology-and-tools.md)** — the thought experiment, full Tiger/Paper Tiger/Elephant classification with examples, urgency table, the 6-phase facilitation script, `risk_categorizer.py` usage and flags, output formats, troubleshooting, success criteria, and bibliography. Read when running or scripting a session.
- **[references/pre-mortem-guide.md](references/pre-mortem-guide.md)** — Gary Klein's origin and why pre-mortems work, when (and when not) to run one, deep classification criteria across domains, the facilitation timeline, and a worked SaaS launch example. Read for the theory and a full example.
- **[references/red-flags.md](references/red-flags.md)** — 12 anti-patterns (mitigation theater, groupthink, vague risks, over-mitigated elephants, late pre-mortems, missing owners) with bad/good examples and one-line checks. Read before sharing pre-mortem output.

## Scope & Limitations

**In Scope:** prospective hindsight using the "14 days after launch failure" framing; Tiger / Paper Tiger / Elephant classification with urgency levels; automated elephant escalation detection; risk registry generation; facilitation methodology for in-person and remote teams.

**Out of Scope:** ongoing risk management and tracking (see `senior-pm/risk_matrix_analyzer.py`); quantitative probability/impact scoring (`senior-pm/`); product discovery and hypothesis validation (`brainstorm-experiments/`); technical architecture risk assessment (`engineering/` skills).

**Important Caveats:** most effective with 4-8 participants; the elephant escalation keyword check is a heuristic; pre-mortems complement, not replace, assumption mapping (`identify-assumptions/`); psychological safety is a prerequisite.

## Integration Points

| Integration | Direction | Description |
|------------|-----------|-------------|
| `brainstorm-ideas/` | Receives from | Ideas that passed initial validation are subject to pre-mortem before full build |
| `brainstorm-experiments/` | Receives from | Post-experiment, pre-mortem stress-tests the build decision |
| `identify-assumptions/` | Bidirectional | Launch-blocking tigers may surface new assumptions; elephants often reveal avoided assumptions |
| `execution/create-prd/` | Feeds into | Tiger mitigations become PRD risk sections and assumption validation plans |
| `senior-pm/` | Feeds into | Launch-blocking tigers escalate into portfolio risk registers via `risk_matrix_analyzer.py` |
| `scrum-master/` | Feeds into | Fast-follow tigers become sprint backlog items with mitigation-focused stories |

---

## OpenCode / SnapShelf Extension

When this skill is used inside OpenCode against the SnapShelf repository,
combine the original product pre-mortem methodology with direct repository
inspection.

### Repository Evidence First

Before classifying technical risks, inspect relevant evidence from the actual
repository when available.

Prioritize:

- AGENTS.md and project documentation
- README files
- package.json and dependency configuration
- application architecture
- data persistence and migrations
- authentication and authorization, if applicable
- filesystem and local-storage behavior
- image import, capture, storage, deletion, and export flows
- external APIs and SDKs
- permissions
- error handling and recovery
- tests
- build configuration
- release/deployment configuration
- TODO and FIXME comments
- recent git changes when relevant

Never present an assumption as repository evidence.

For every important finding, distinguish between:

1. Evidence — directly supported by repository code, documentation, tests,
   configuration, logs, or other concrete artifacts.
2. Inference — a plausible conclusion derived from the implementation.
3. Unknown — something that must be validated rather than assumed.

### Technical Risk Domains

When conducting a software pre-mortem, explicitly investigate:

#### Architecture
- unclear ownership of state
- excessive coupling
- race conditions
- fragile abstractions
- single points of failure
- architectural decisions that are difficult to reverse

#### Data & Storage
- data corruption
- destructive operations
- migration failures
- lost user content
- duplicate records/files
- rollback and recovery problems

#### Filesystem & Media
- accidental deletion
- filename/path collisions
- unavailable or moved files
- stale thumbnails or metadata
- broken image references
- storage exhaustion
- import/export failures

#### Security
- authentication failures
- authorization/RBAC mistakes
- secret leakage
- injection vulnerabilities
- unsafe external input
- insecure local data handling

#### Privacy
- unexpected data leaving the device
- user media being transmitted unnecessarily
- analytics or AI providers receiving private content
- unclear retention behavior

#### Reliability
- partial failures
- retry loops
- missing idempotency
- inconsistent state after crashes
- poor offline behavior
- lack of recovery mechanisms

#### AI / Agent Behavior

If AI or agents are part of the feature being analyzed:

- hallucinated actions
- destructive tool calls
- excessive autonomy
- prompt injection
- incorrect file classification
- actions based on low-confidence inference
- missing confirmation gates
- runaway token/API usage
- inability to undo AI actions

#### UX
- destructive actions that are too easy
- unclear user feedback
- misleading success states
- missing undo/recovery
- confusing permissions
- workflows that require excessive manual intervention

#### Testing
- missing tests around critical user data
- missing destructive-operation tests
- untested migrations
- untested failure states
- insufficient end-to-end coverage

#### Dependencies
- unstable APIs
- abandoned libraries
- platform-specific behavior
- breaking SDK changes
- unnecessary dependency complexity

#### Maintainability
- architecture requiring continual manual maintenance
- hidden operational work
- difficult debugging
- tightly coupled components
- excessive complexity for a solo-maintained project

#### Product
- solving the wrong problem
- excessive complexity for the user benefit
- features users cannot discover
- assumptions not validated by actual usage

### Solo Developer Mode

When only one developer is participating, do not invent fictional team members.

Instead, analyze the project from simulated stakeholder perspectives:

- Developer / maintainer
- End user
- Security reviewer
- Reliability / operations reviewer
- Product reviewer
- Privacy reviewer

Clearly label these as simulated perspectives.

Use them to challenge assumptions and reveal risks the developer may otherwise
overlook.

Repository evidence must always take precedence over simulated concerns.

### Technical Tiger Classification

A technical issue should normally be classified as a Tiger only when there is
concrete supporting evidence or a strongly evidenced architectural path to
failure.

Do not classify speculative concerns as Tigers simply because the consequences
would be severe.

For each Tiger include:

- Risk
- Category
- Urgency
- Repository evidence
- Failure scenario
- Mitigation
- Verification method
- Owner or owner role
- Decision date or decision condition

### Launch Recommendation

At the end of a repository pre-mortem, provide:

## Launch Recommendation

One of:

- GO
- CONDITIONAL GO
- NO-GO

Then provide:

- Launch-blocking Tigers
- Conditions required before launch
- Fast-follow items
- Risks to monitor
- Unknowns requiring validation

Do not modify source code during the pre-mortem unless the user explicitly asks
you to implement a mitigation.

