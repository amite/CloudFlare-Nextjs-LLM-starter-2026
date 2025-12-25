Automatic Token Savings Tracking
How it works:
At the end of each plan mode session (SessionEnd hook), the tracking script runs automatically
It logs estimated tokens saved (~14,400 per session based on Quick Reference vs full exploration)
It displays a summary in your terminal
All data is stored in .claude/plan-stats.json
What you'll see after each plan session:

📊 Token Savings Summary
────────────────────────────────────
This session:   ~14,400 tokens saved
Total saved:    ~14,400 tokens (1 sessions)
Baseline cost:  15,000 tokens (old way)
Quick Ref cost: 600 tokens (new way)
────────────────────────────────────
View details: cat .claude/plan-stats.json
Check anytime:

# View full stats
cat .claude/plan-stats.json

# See just the summary
bat .claude/plan-stats.json | jq '.total_tokens_saved_estimate, .total_sessions_tracked'

# Or with jq
jq '.total_tokens_saved_estimate, .total_sessions_tracked' .claude/plan-stats.json
Zero extra work: The hook runs automatically at the end of each session, no manual logging needed. Your savings are tracked transparently in the background.