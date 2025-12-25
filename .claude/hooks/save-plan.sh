#!/bin/bash

# Read hook input from stdin
input=$(cat)

# Extract the transcript path
transcript_path=$(echo "$input" | jq -r '.transcript_path // empty')
session_id=$(echo "$input" | jq -r '.session_id // empty')
permission_mode=$(echo "$input" | jq -r '.permission_mode // empty')

# Only run in plan mode
if [ "$permission_mode" != "plan" ]; then
  exit 0
fi

# Ensure transcript exists
if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  exit 0
fi

# Create the plans directory if it doesn't exist
plans_dir="$CLAUDE_PROJECT_DIR/artifacts/wip/plans"
mkdir -p "$plans_dir"

# Extract the last Claude response from the transcript
# The transcript is JSONL format, so we parse the last message
last_response=$(tail -1 "$transcript_path" | jq -r '.content // empty' 2>/dev/null)

# Check if the last response contains plan indicators
if echo "$last_response" | grep -qEi "(approach|step|implementation|objectives|architecture|affected files|testing|domain)" || \\
   echo "$last_response" | grep -qE "^(#{1,3}|[-*] )" ; then
  
  # Generate a descriptive filename from the plan content
  # Extract the main topic/title from the response
  plan_title=$(echo "$last_response" | head -5 | grep -oEi "^#{1,3}\\s+.*" | sed 's/^#+\\s*//' | head -1)
  
  if [ -z "$plan_title" ]; then
    # Fallback: use first sentence
    plan_title=$(echo "$last_response" | head -1 | sed 's/[^a-zA-Z0-9 ]//g' | cut -c1-50)
  fi
  
  # Sanitize the filename (remove special chars, convert spaces to hyphens)
  sanitized=$(echo "$plan_title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/-$//')
  
  # Create filename with timestamp
  timestamp=$(date +%s)
  filename="${sanitized}-plan.md"
  filepath="$plans_dir/$filename"
  
  # Handle duplicate filenames
  counter=1
  original_filepath=$filepath
  while [ -f "$filepath" ]; do
    filename="${sanitized}-plan-${counter}.md"
    filepath="$plans_dir/$filename"
    counter=$((counter + 1))
  done
  
  # Write the plan to disk
  cat > "$filepath" << 'EOF'
# Plan

**Session ID:** $SESSION_ID
**Created:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Objectives
(Define the goals and objectives of this plan)

## Implementation Steps
(Ordered list of implementation steps)

## Affected Files
(List of files that will be modified or created)

## Testing Strategy
(How to test the implementation)

## Architectural Decisions
(Key architectural decisions and reasoning)

---

## Full Plan Content

EOF
  
  # Append the actual plan content
  echo "$last_response" >> "$filepath"
  
  # Output JSON to indicate success
  cat << EOF
{
  "continue": true,
  "systemMessage": "Plan saved to: artifacts/wip/plans/$filename"
}
EOF
  
  exit 0
fi

exit 0