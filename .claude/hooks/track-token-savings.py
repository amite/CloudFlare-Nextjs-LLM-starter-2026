#!/usr/bin/env python3
"""
Tracks estimated token savings from using Quick Reference in plan mode.
Runs on SessionEnd hook to log token usage after each plan session.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

def main():
    try:
        hook_input = json.load(sys.stdin)
    except:
        hook_input = {}

    stats_file = Path(".claude/plan-stats.json")

    # Load existing stats
    if stats_file.exists():
        with open(stats_file) as f:
            stats = json.load(f)
    else:
        stats = {
            "plan_sessions": [],
            "baseline_exploration_cost": 15000,
            "quick_reference_load_cost": 600,
            "estimated_average_savings_per_session": 14400,
            "total_sessions_tracked": 0,
            "total_tokens_saved_estimate": 0
        }

    # Extract session info (if available)
    session_data = {
        "timestamp": datetime.now().isoformat(),
        "session_id": hook_input.get("session_id", "unknown"),
        "estimated_tokens_saved": stats["estimated_average_savings_per_session"],
        "baseline_cost": stats["baseline_exploration_cost"],
        "quick_ref_cost": stats["quick_reference_load_cost"],
        "notes": "Plan mode session completed with Quick Reference optimization"
    }

    # Update stats
    stats["plan_sessions"].append(session_data)
    stats["total_sessions_tracked"] += 1
    stats["total_tokens_saved_estimate"] = (
        stats["total_sessions_tracked"] * stats["estimated_average_savings_per_session"]
    )

    # Write back
    with open(stats_file, "w") as f:
        json.dump(stats, f, indent=2)

    # Print summary
    total_saved = stats["total_tokens_saved_estimate"]
    sessions = stats["total_sessions_tracked"]
    avg_per_session = stats["estimated_average_savings_per_session"]

    print(f"""
📊 Token Savings Summary
{'─' * 40}
This session:   ~{avg_per_session:,} tokens saved
Total saved:    ~{total_saved:,} tokens ({sessions} sessions)
Baseline cost:  {stats['baseline_exploration_cost']:,} tokens (old way)
Quick Ref cost: {stats['quick_reference_load_cost']:,} tokens (new way)
{'─' * 40}
View details: cat .claude/plan-stats.json
""")

    sys.exit(0)

if __name__ == "__main__":
    main()
