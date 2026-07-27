# Things 3 Reference App Info

## Positioning

Things 3 is a personal task-management system for Apple devices. It is not a
team project-management platform, a notes app, a calendar replacement, or a full
GTD database.

Its useful product boundary is narrow:

> Capture tasks quickly, organize them into projects and areas, decide what
> matters today, and keep future work out of view until it becomes relevant.

This narrowness is the product. A clone should not start by copying every
feature; it should first preserve the mental model.

## Mental Model

Things 3 organizes work across two dimensions:

| Dimension         | Purpose                                    | Examples                                        |
| ----------------- | ------------------------------------------ | ----------------------------------------------- |
| When              | When should this task come back into view? | Today, This Evening, Upcoming, Anytime, Someday |
| Structure/context | What does this task belong to?             | Inbox, Area, Project, Heading, Tag              |

The practical flow is:

```text
Inbox -> process -> Area / Project -> schedule -> Today -> done
```

The most important design decision is that Things separates "when to start"
from "when it is due." That prevents deadlines from becoming fake priority
labels.

## Core Concepts

### Inbox

The Inbox is for fast capture. Users put tasks there before deciding where they
belong.

Examples:

```text
- Buy USB-C cable
- Read article about Playwright
- Ask doctor about PSA/free PSA
- Check browserless token setup
```

The Inbox should be low-friction and lightly structured. The point is to avoid
losing the thought, not to organize during capture.

### Areas

Areas are ongoing responsibility zones. They do not finish.

Examples:

```text
Development
Health
Finance
Home
Learning
Self-hosting
Documents
```

Use an Area when the category is durable. A one-time outcome should be a
Project, not an Area.

```text
Bad:
Area: Fix Docker issue

Better:
Area: Self-hosting
Project: Fix Docker issue
```

### Projects

Projects are outcomes with multiple steps. They should eventually complete.

Examples:

```text
Project: Set up Browserless in Docker
Project: Prepare prostate cancer second-opinion questions
Project: Rewrite CV in Typst
Project: Build Payload CMS blog
```

Headings split complex projects into phases, milestones, or sections.

```text
Project: Rewrite CV in Typst

Heading: Data structure
- Clean YAML schema
- Add courses_data
- Add languages_data

Heading: Layout
- Fix grid columns
- Adjust heading spacing
- Add footer page counter

Heading: Export
- Generate PDF
- Compare ATS readability
```

### To-dos

A to-do is the atomic task. Good tasks start with an action.

```text
Good:
- Test Browserless with curl
- Update Caddyfile for private subdomain
- Check Windows adapter link speed

Weak:
- Docker
- CV
- Health
```

Weak tasks usually belong as projects, areas, or notes.

### Checklists

A task can contain a checklist when the subitems are too small to be full tasks.

```text
Task: Prepare doctor questions

Checklist:
- PSA total
- PSA free
- MRI necessity
- Pathology review
- Active surveillance criteria
```

Use checklists for internal details. Use projects for real multi-step work.

## Scheduling Model

### Start Date / When

"When" means:

> When should this task appear?

It does not mean the task is due that day.

```text
Task: Start preparing tax documents
When: March 1
Deadline: April 15
```

Future-start tasks stay out of the way until their start date.

### Deadline

Deadlines should mean real external pressure.

```text
- Pay bill by July 5
- Submit application by August 1
- Renew domain by September 10
```

Avoid fake deadlines. They make the system noisy and train users to ignore it.

### Today

Today is the execution list, not a dump of everything important.

```text
Today
- Finish compose file for Browserless
- Test Tailscale service from phone
- Send medical documents
- 30 min React practice
```

If Today has 40 tasks, the system is not telling the truth.

### This Evening

This Evening is a later-day section inside Today.

```text
- Take out trash
- Call family
- Check router physically
- Prepare documents after work
```

### Upcoming

Upcoming is the planning horizon. It shows future tasks so users can avoid
overloading a day before it arrives.

### Anytime

Anytime is the pool of active, unscheduled tasks available now.

Use it for the question:

> I finished Today. What can I pick next?

### Someday

Someday is for parked ideas.

```text
- Try NixOS
- Learn Rust
- Build custom dashboard
- Explore local-first apps again
```

Someday only works if reviewed. Otherwise it becomes archive-by-neglect.

## Tags

Tags cut across areas and projects.

```text
@home
@office
@errand
@waiting
@deep-work
@quick
@computer
@phone
```

Example:

```text
Area: Development
  Project: Browserless setup
    - Test websocket endpoint      tag: @computer
    - Read browserless docs        tag: @deep-work

Area: Health
  - Call clinic                    tag: @phone
  - Print documents                tag: @errand
```

Keep tags few. Priority is mostly expressed through Today, ordering, deadlines,
and tags, not numeric P1/P2/P3 levels.

## Repeating Work

Things supports repeating to-dos and projects, including fixed schedules and
after-completion patterns.

```text
Every Monday:
- Review open tasks

Every 1st day of month:
- Pay rent
- Check subscriptions

After completion:
- Clean keyboard
- Review backup status
```

| Repeat type      | Meaning                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| Fixed schedule   | Repeat on the calendar rhythm, whether or not the previous instance was completed |
| After completion | Repeat a duration after the user actually completed the previous instance         |

Use fixed schedules for external rhythm. Use after-completion repeats for
maintenance tasks.

## Notes

Tasks and projects can have notes. Notes are useful for context, not for turning
the task app into a knowledge base.

```text
Task: Fix Tailscale service

Notes:
- Problem: service shows "needs configuration"
- Suspect: wrong tcp:443 config
- Test from phone and laptop
```

If a note becomes a full spec, research archive, or link database, it belongs in
a document or notes app.

## Calendar Integration

Things can show Apple Calendar events beside tasks in Today and Upcoming. This
helps users plan around real commitments.

```text
Today

Calendar:
- 10:00 Meeting
- 14:00 Doctor call

Tasks:
- Prepare questions before 14:00
- Test Docker service
```

Things is not a calendar replacement. It does not try to own time-blocking.

## Capture and Automation

Things has strong Apple ecosystem integration:

| Feature            | Use                                               |
| ------------------ | ------------------------------------------------- |
| Quick Entry on Mac | Capture tasks without switching context           |
| Share Sheet        | Send links/text from Safari, Mail, and other apps |
| Mail to Things     | Create tasks by email                             |
| Apple Shortcuts    | Automate creating, editing, and finding tasks     |
| URL scheme         | Deep links and advanced automation                |
| AppleScript        | Mac-only automation                               |

Developer-useful automation can create project templates with headings and
tasks, even though Things does not have first-class built-in templates.

```text
Project: New Next.js feature

Heading: Planning
- Define user flow
- Define data model

Heading: Implementation
- Create server action
- Add Zod schema
- Build UI
- Add tests

Heading: Review
- Run typecheck
- Run lint
- Manual QA
```

## Platform and Sync Scope

Things is Apple-only.

```text
Supported:
- Mac
- iPhone
- iPad
- Apple Watch
- Apple Vision Pro

Not supported:
- Windows
- Android
- Linux
- Web browser
```

Sync uses Things Cloud, not iCloud, Dropbox, or another third-party sync
service. Pricing and platform packaging can change, so confirm current App
Store details before relying on them.

## Non-goals and Limits

These limits are central to the product shape:

| Missing / limited                | Why it matters                                   |
| -------------------------------- | ------------------------------------------------ |
| No real-time collaboration       | Poor fit for team tasks                          |
| No Windows / Android / web app   | Poor fit for cross-platform users                |
| No file attachments              | Poor fit for document-heavy workflows            |
| No Kanban/status workflow        | Poor fit for software project tracking           |
| No comments/assignees            | Poor fit for teams                               |
| No native Pomodoro/habit tracker | Poor fit as an all-in-one productivity suite     |
| No full notes/database system    | Poor fit for research-heavy knowledge management |

## Best-fit Use Cases

Excellent fit:

```text
Personal task management
Solo developer planning
Daily/weekly planning
Household/admin tasks
Medical/admin follow-ups
Learning plans
Small personal projects
Recurring routines
Apple-only workflow
```

Weak fit:

```text
Team project management
Client collaboration
Cross-platform work
Large documentation
Bug tracking
Agile boards
File-heavy workflows
Shared household task lists
```

## Example Developer Setup

```text
Areas

Development
  Project: Portfolio redesign
  Project: Payload CMS blog
  Project: Browserless scraping stack
  Project: Typst CV system

Self-hosting
  Project: Tailscale private services
  Project: Caddy logs cleanup
  Project: Restic backups

Health
  Project: Prostate cancer follow-up
  Project: Medical document archive

Learning
  Project: React problem practice
  Project: Algorithms refresh

Home/Admin
  Project: Fix Wi-Fi speed
  Project: Sell domain
```

Suggested tags:

```text
@deep-work
@quick
@waiting
@phone
@errand
@computer
@review
```

Daily flow:

```text
Morning:
1. Open Today
2. Remove fake priorities
3. Pick 3-7 realistic tasks
4. Order them manually

During day:
1. Capture new items into Inbox
2. Work top-down from Today

Evening:
1. Reschedule unfinished tasks
2. Process Inbox
3. Check Upcoming if tomorrow looks overloaded
```

## Product Judgment

Things 3 is best understood as:

> A polished personal execution system for Apple users.

It is not trying to be Jira, Notion, Todoist Business, Linear, Trello, or
Obsidian. That restraint is its strength.

Use it as a reference when the goal is fewer moving parts and stronger daily
clarity. Do not use it as a reference when the product needs collaboration,
files, comments, team state, web access, or cross-platform availability.

## UI Reference Images

Use `things-3-images/` as the visual reference set for future UI changes that
move this app toward the Things-inspired personal task model.

Reference files:

```text
things-3-images/desktop-mac.png
things-3-images/tablet-ipad.png
things-3-images/mobile-iphone.png
```

Study these images for layout density, sidebar/content hierarchy, Today-list
structure, platform adaptation, and quiet interaction surfaces. Do not copy the
Things 3 UI directly.

## Source Links

- https://culturedcode.com/things/
- https://culturedcode.com/things/guide/
- https://culturedcode.com/things/support/articles/4001304/
- https://culturedcode.com/things/support/articles/2803569/
- https://culturedcode.com/things/support/articles/2803577/
- https://culturedcode.com/things/support/articles/2803579/
- https://culturedcode.com/things/support/articles/2803581/
- https://culturedcode.com/things/support/articles/2803564/
- https://culturedcode.com/things/support/articles/4438545/
- https://culturedcode.com/things/support/articles/2803583/
- https://culturedcode.com/things/support/articles/2803573/
- https://culturedcode.com/things/support/articles/2693493/
- https://culturedcode.com/things/support/articles/2803552/
- https://culturedcode.com/things/support/articles/2803586/
- https://culturedcode.com/things/support/articles/2967034/
