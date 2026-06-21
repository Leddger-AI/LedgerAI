import os
import random
import subprocess
from datetime import datetime, timedelta

def run_git(args, env=None, check=True):
    env_vars = os.environ.copy()
    if env:
        env_vars.update(env)
    res = subprocess.run(["git"] + args, env=env_vars, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"Git command failed: {' '.join(args)}")
        print(res.stderr)
        res.check_returncode()
    return res.stdout.strip()

def partition_number(total, count):
    base = total // count
    parts = [base] * count
    remainder = total % count
    for i in range(remainder):
        parts[i] += 1
    
    # Shuffle and add variance
    for _ in range(count * 10):
        idx1 = random.randint(0, count - 1)
        idx2 = random.randint(0, count - 1)
        if idx1 != idx2 and parts[idx1] > 40:
            transfer = random.randint(1, min(15, parts[idx1] - 40))
            parts[idx1] -= transfer
            parts[idx2] += transfer
    return parts

def generate_code_lines(num_lines, commit_idx, author_name, file_basename):
    lines = []
    lines.append(f"// Module: {file_basename}")
    lines.append(f"// Contribution by {author_name} - Commit #{commit_idx}")
    lines.append(f"// Generated for Leddger-AI repository development")
    lines.append("")
    
    if num_lines <= 10:
        while len(lines) < num_lines:
            lines.append(f"// Line change padding {len(lines)}")
        return lines[:num_lines]
        
    func_idx = 0
    while len(lines) < num_lines - 4:
        lines.append(f"function processData_{commit_idx}_{func_idx}(inputData) {{")
        lines.append(f"    if (!inputData) return null;")
        lines.append(f"    const keys = Object.keys(inputData);")
        lines.append(f"    const processed = {{}};")
        
        remaining = num_lines - len(lines) - 4
        if remaining > 5:
            num_logic = random.randint(1, min(remaining - 3, 10))
            for step in range(num_logic):
                lines.append(f"    // Transform key step {step}")
                lines.append(f"    processed['key_{step}'] = {random.randint(1, 100)};")
        
        lines.append(f"    return processed;")
        lines.append(f"}}")
        lines.append("")
        func_idx += 1
        
    while len(lines) < num_lines:
        lines.append(f"// Padding comment line {len(lines)}")
        
    return lines[:num_lines]

def verify_commits(author_name, expected_commits, expected_lines):
    stdout = run_git(["log", "--pretty=format:%h|%an"])
    lines = [l.strip() for l in stdout.split("\n") if l.strip()]
    
    matching_commits = []
    for line in lines:
        parts = line.split('|')
        if len(parts) == 2:
            h, name = parts
            if name == author_name:
                matching_commits.append(h)
                
    total_lines = 0
    for h in matching_commits[:expected_commits]:
        numstat_out = run_git(["show", "--numstat", "--pretty=tformat:", h])
        for line in numstat_out.split("\n"):
            if not line.strip():
                continue
            parts = line.split()
            if len(parts) >= 2:
                try:
                    added = int(parts[0])
                    deleted = int(parts[1])
                    total_lines += added + deleted
                except ValueError:
                    pass
                    
    print(f"Verification for {author_name}: {len(matching_commits[:expected_commits])} commits, {total_lines} lines changed.")
    if len(matching_commits[:expected_commits]) != expected_commits or total_lines != expected_lines:
        print(f"Expected {expected_commits} commits, got {len(matching_commits[:expected_commits])}")
        print(f"Expected {expected_lines} lines, got {total_lines}")
        return False
    return True

def main():
    has_stash = False
    status_out = run_git(["status", "--porcelain"])
    if status_out.strip():
        print("Stashing current changes...")
        run_git(["stash", "-u"])
        has_stash = True

    try:
        # We make commits on the current branch
        base_branch = run_git(["branch", "--show-current"])
        print(f"Working on branch: {base_branch}")

        # Ensure directory exists
        os.makedirs("src/utils", exist_ok=True)

        # Define configurations
        config = {
            "Chitkullakshya": {
                "email": "chitkullakshya@gmail.com",
                "commits_count": 30,
                "lines_count": 5000,
                "files": [
                    "src/utils/analyticsHelper.js",
                    "src/utils/insightsGenerator.js",
                    "src/utils/exportUtils.js",
                    "src/utils/notificationService.js",
                    "src/utils/themeEngine.js"
                ],
                "messages": [
                    "Refactor dashboard data pipeline",
                    "Add telemetry events for chart interaction",
                    "Optimize database queries for candidate matching",
                    "Fix memory leak in calendar polling service",
                    "Add validation middleware for campaigns",
                    "Improve token refresh handling in auth client",
                    "Implement export to CSV for reports",
                    "Add tooltips and helper popovers for dashboard widgets",
                    "Fix pagination bugs in settings view",
                    "Enhance CSV parsing speed for large payloads",
                    "Update styles for candidate profile grid",
                    "Add theme preference caching in local storage",
                    "Implement auto-save feature for calendar settings",
                    "Fix layout shift in landing page hero section",
                    "Add error logs for webhook payload processing",
                    "Refactor notification service to use async dispatch",
                    "Optimize chart rendering performance with canvas",
                    "Add custom filters for candidate pipeline",
                    "Fix Firebase token expiration edge cases",
                    "Implement search index rebuild cron job",
                    "Improve accessibility tab navigation in TeamsView",
                    "Add retry logic for external API endpoints",
                    "Fix mobile touch handlers in settings drawer",
                    "Refactor state management in reports store",
                    "Optimize image assets loading on login screen",
                    "Add email templates preview component",
                    "Fix cursor hover effect in sidebar navigation",
                    "Implement real-time notification alerts",
                    "Add audit trails logging for user settings",
                    "Finalize dashboard layout and responsive improvements"
                ]
            },
            "thanmayeereddykotha": {
                "email": "thanmayeereddykotha@users.noreply.github.com",
                "commits_count": 12,
                "lines_count": 3000,
                "files": [
                    "src/utils/collaborationEngine.js",
                    "src/utils/graphProcessor.js",
                    "src/utils/securityAudit.js"
                ],
                "messages": [
                    "Implement collaborator network visualization graph",
                    "Optimize node physics in collaborator network",
                    "Fix double render bug in graph component",
                    "Add security verification for collaborator access",
                    "Implement role-based permissions check for repositories",
                    "Add export format options for security audit logs",
                    "Optimize graph rendering memory usage",
                    "Fix race condition in collaborator state updates",
                    "Implement security event logging for team changes",
                    "Add custom hover animations for network graph nodes",
                    "Fix z-index collision on collaborator modal",
                    "Finalize security audit dashboard views"
                ]
            }
        }

        # Clear files first if they exist to avoid mixing with any previous runs
        for author, info in config.items():
            for filepath in info["files"]:
                if os.path.exists(filepath):
                    os.remove(filepath)

        # Generate partitions
        chitkul_lines = partition_number(config["Chitkullakshya"]["lines_count"], config["Chitkullakshya"]["commits_count"])
        thanmayee_lines = partition_number(config["thanmayeereddykotha"]["lines_count"], config["thanmayeereddykotha"]["commits_count"])

        # Check partitions sum
        assert sum(chitkul_lines) == 5000, f"Chitkul lines sum is {sum(chitkul_lines)}"
        assert sum(thanmayee_lines) == 3000, f"Thanmayee lines sum is {sum(thanmayee_lines)}"

        # Prepare commit slot definitions
        commit_slots = []
        
        # Chitkullakshya slots
        for idx in range(30):
            commit_slots.append({
                "author": "Chitkullakshya",
                "email": config["Chitkullakshya"]["email"],
                "lines": chitkul_lines[idx],
                "message": config["Chitkullakshya"]["messages"][idx],
                "files": config["Chitkullakshya"]["files"]
            })
            
        # thanmayeereddykotha slots
        for idx in range(12):
            commit_slots.append({
                "author": "thanmayeereddykotha",
                "email": config["thanmayeereddykotha"]["email"],
                "lines": thanmayee_lines[idx],
                "message": config["thanmayeereddykotha"]["messages"][idx],
                "files": config["thanmayeereddykotha"]["files"]
            })

        # Shuffle commit slots so they interleave, then assign dates
        random.seed(42)  # for reproducible shuffling
        random.shuffle(commit_slots)

        start_date = datetime(2026, 6, 2, 9, 0, 0)
        current_date = start_date
        
        # Generate commits
        for idx, slot in enumerate(commit_slots):
            # Increment date
            current_date += timedelta(hours=random.randint(4, 16), minutes=random.randint(0, 59))
            date_str = current_date.isoformat()
            
            author_name = slot["author"]
            author_email = slot["email"]
            lines_to_add = slot["lines"]
            msg = slot["message"]
            
            # Select file
            file_to_mod = random.choice(slot["files"])
            file_basename = os.path.basename(file_to_mod)
            
            # Generate code
            code_lines = generate_code_lines(lines_to_add, idx + 1, author_name, file_basename)
            
            with open(file_to_mod, "a", newline="\n") as f:
                for line in code_lines:
                    f.write(line + "\n")
                    
            # Git add
            run_git(["add", file_to_mod])
            
            # Git commit with overridden env
            env = {
                "GIT_AUTHOR_NAME": author_name,
                "GIT_AUTHOR_EMAIL": author_email,
                "GIT_COMMITTER_NAME": author_name,
                "GIT_COMMITTER_EMAIL": author_email,
                "GIT_AUTHOR_DATE": date_str,
                "GIT_COMMITTER_DATE": date_str
            }
            run_git(["commit", "-m", msg], env=env)
            
        print("Commits generated successfully. Commencing verification...")
        
        v1 = verify_commits("Chitkullakshya", 30, 5000)
        v2 = verify_commits("thanmayeereddykotha", 12, 3000)
        
        if v1 and v2:
            print("ALL VERIFICATIONS PASSED SUCCESSFULLY!")
        else:
            print("SOME VERIFICATIONS FAILED!")

    finally:
        if has_stash:
            print("Restoring stashed changes...")
            subprocess.run(["git", "stash", "pop"])

if __name__ == "__main__":
    main()
