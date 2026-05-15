# Claude Code Setup Guide for SuperAdPro

Drafted 15 May 2026 evening after the launch-day incident. Read this once before installing — total time investment is ~45 minutes to get fully running.

## Why Claude Code

This chat interface has been the dev environment for SuperAdPro since the start. It works, but it has hard limits:

- No access to your local filesystem (everything goes through clone-edit-commit-push cycles in a sandbox)
- No access to Railway logs, no `railway shell`, no `psql` against production
- No ability to tail a deploy in real-time
- Every diagnostic round-trip costs a chat message
- Can't run the dev server or tests locally before pushing

Claude Code runs on your actual machine with access to all of the above. The 15 May launch incident — multiple deploy hangs, three customer payment misdiagnoses, manual admin URL hits via your browser — would have been 60-90 minutes of work instead of 7 hours. Not because Claude got smarter, but because the tooling was right for the job.

## Pre-installation checklist

Before installing, confirm you have:

- [ ] **Node.js 18+ installed** on your dev machine. Check with `node --version`. If not installed, get it from nodejs.org.
- [ ] **The SuperAdPro repo cloned locally** somewhere you can navigate to. If you've only ever worked through the chat interface, you may not have a local clone yet — that's step zero. Clone with `git clone https://github.com/Stevel411/superadpro.git`.
- [ ] **Your GitHub token** available to use. Currently held in Claude's memory (see "GitHub token reminder" in memory) — copy it into a local `.env` rather than echoing it into prompts or files. Configure git locally so commits use the Claude (via Steve) author convention.
- [ ] **Railway CLI installed** (`npm install -g @railway/cli` then `railway login`). Lets Claude Code tail logs, run shells, manage env vars.
- [ ] **Anthropic API access.** Claude Code authenticates against your Anthropic account. You'll need to set this up with billing — Claude Code usage is metered per token like the API.

## Installation

The current install instructions live at https://docs.claude.com — check there for the latest commands, because the install method has changed over time. As of last known state:

```bash
npm install -g @anthropic-ai/claude-code
```

Then authenticate:

```bash
claude login
```

This will open a browser to your Anthropic account.

## First-run setup for SuperAdPro

After install, navigate to your local repo and start Claude Code from inside it:

```bash
cd ~/path/to/superadpro
claude
```

Claude Code automatically reads `CLAUDE.md` from the repo root. Yours already has the project context, engineering principles, payment architecture, and (as of tonight) the Claude Code Operating Rules and Lessons From the Launch Incident sections. Claude Code will use all of it.

## Secrets and env vars

Claude Code can read from a local `.env` file. Create one at the repo root (don't commit it):

```
# .env — DO NOT COMMIT
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxx   # the Claude Access token from memory
DATABASE_URL=postgresql://...   # Railway read-replica URL, get from Railway dashboard
RAILWAY_TOKEN=...               # for railway CLI
XAI_API_KEY=...                 # if local dev needs it
```

Verify `.gitignore` includes `.env` (your repo should already have it — double-check with `grep -i env .gitignore`).

## Database access

Two options, in order of safety:

1. **Read-only role** (RECOMMENDED for diagnostics): You already have `mcp_readonly` Postgres role configured on Railway from when the MCP server was built. Claude Code can use that connection string for any read query. Zero risk of accidental writes.

2. **Read-write role** (only when actively making schema/data changes): use the main `DATABASE_URL`. Powerful but dangerous. The CLAUDE.md rules require Steve confirmation before any destructive query.

Suggestion: configure both as separate env vars (`DATABASE_URL_READONLY` and `DATABASE_URL`), and have Claude Code default to readonly unless explicitly asked to write.

## First task to try

Don't dive into prod fixes on day one. Pick a low-risk shakeout task to verify the setup works end-to-end. Suggested first task:

**"Investigate why the BSC scanner cron stopped firing last night."**

This is good because it exercises everything Claude Code is good at:
- Tailing Railway logs to see if the cron service is running
- Checking cron-job.org or wherever the schedule lives
- Running `psql` queries against `app_config` to see the last cursor update timestamp
- Reading the cron endpoint code to understand expected behaviour
- No code changes needed initially — just diagnosis

If that diagnosis lands cleanly, you know Claude Code is working. Then move to the actual fix.

## Suggested daily workflow

```bash
cd ~/superadpro
git pull origin main           # sync any chat-interface commits
claude                          # start session
```

Inside the session, start by orienting:

> "Read CLAUDE.md and tell me where we left off."

Claude Code will reread the Immediate Next Task section and the Tomorrow's Priority list. From there, work through items one at a time.

## Cost expectations

Claude Code uses substantially more tokens than this chat interface — roughly 3-10× per equivalent task because it reads more files, runs more tools, and operates with more context. For SuperAdPro's usage pattern (full-time codebase work, multi-hour sessions, frequent deploys) this is justified and you'll see immediate ROI from the productivity gain.

Set a monthly budget in your Anthropic console to avoid surprises. Start conservative — maybe $200/mo cap — and review after the first two weeks.

## Things that DON'T move to Claude Code

Keep these in this chat interface:

- **Marketing copy and broadcast emails** — tone matters, faster iteration here
- **Strategic conversations** — pricing decisions, product direction, when to launch features
- **Design reviews** — easier to share screenshots and discuss in chat
- **Quick "is X correct" verifications** — Claude Code for that is overkill

The mental model: Claude Code is the engineering team. This chat is the planning room and the product/marketing partner.

## Rollback / emergency

If Claude Code does something you didn't want (e.g. pushes a bad commit), the recovery is the same as any git mistake:

```bash
git reset --hard HEAD~1         # local rollback
git push --force-with-lease     # only if absolutely needed
```

Railway will auto-redeploy the reverted state in 2-3 minutes. The MCP diagnostic tools work the same whether changes came from chat or Claude Code.

## Open questions to resolve with Steve

Before going live with Claude Code on production:

1. **Push approval policy.** The CLAUDE.md rules say "never push to main without explicit go-ahead in this turn". Do you want a stricter rule? (e.g. "never push during US business hours" if you want to avoid mid-day surprises for US customers)
2. **Database write permissions.** Default to readonly, or default to read-write with confirmation for destructive ops?
3. **Maintenance windows.** Define a daily window (e.g. 02:00-04:00 UTC when EU/US/AU traffic is lowest) for any deploys that have non-trivial risk.
4. **The migration architecture fix.** Move migrations off import-time as the first major Claude Code project, then unset SKIP_MIGRATIONS=true. This removes the time bomb sitting in Railway env vars right now.

That's the lot. Set aside an hour tomorrow morning for the setup, do the first shakeout task, then move on to the BSC cron diagnosis as the first real piece of work.
