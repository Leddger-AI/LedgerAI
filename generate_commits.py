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

def main():
    print("Stashing current changes...")
    run_git(["stash", "-u"])

    try:
        # Reset to origin/eesha to wipe the previous mock commits
        print("Resetting branch to origin/eesha to clear previous mock commits...")
        run_git(["reset", "--hard", "origin/eesha"])

        base_branch = run_git(["branch", "--show-current"])
        if not base_branch:
            base_branch = "eesha"
            
        print(f"Base branch: {base_branch}")

        # Delete old mock branches
        for i in range(1, 8):
            try:
                run_git(["branch", "-D", f"mock-pr-{i}"], check=False)
                run_git(["branch", "-D", f"feature-update-{i}"], check=False)
            except:
                pass

        num_commits = 45
        num_prs = 7

        commits_per_pr = [1] * num_prs
        remaining = num_commits - num_prs
        for _ in range(remaining):
            commits_per_pr[random.randint(0, num_prs - 1)] += 1

        start_date = datetime(2026, 6, 1)
        merge_start_date = datetime(2026, 6, 15)

        commit_messages = [
            "Refactor AI meeting attribution logic", "Add dark mode toggle for dashboard", 
            "Fix JWT token verification issue in auth", "Improve calendar sync speed by batching", 
            "Update candidate dashboard UI", "Fix GitHub OAuth callback state parameter",
            "Optimize React component rendering", "Add unit tests for ai_engine", 
            "Update dependencies in package.json", "Fix mobile responsive layout in LandingPage",
            "Implement candidate ranking algorithm", "Add loading skeletons for API calls",
            "Setup GitHub App integration webhook", "Add Rust axum backend prototype",
            "Fix CORS issue on production server", "Implement batch dispatch for invites",
            "Add error boundaries to React app", "Update README with setup instructions",
            "Fix typography scale in CSS", "Add interactive product tour components",
            "Migrate database schema for candidates", "Add candidate profile avatar fetching",
            "Implement real-time sync for GitHub repos", "Fix memory leak in Python backend",
            "Refactor project file structure", "Add Dockerfile for backend deployment",
            "Enhance security of JWT signing", "Add data analysis visual charts",
            "Fix z-index bug on modal overlay", "Improve error messages in UI",
            "Setup CI/CD pipeline in GitHub Actions", "Add form validation for campaigns",
            "Optimize image assets for web", "Fix routing issue on candidate flow",
            "Add rate limiting to backend APIs", "Implement caching for calendar events",
            "Update color palette to Ledger AI brand", "Add telemetry and logging",
            "Fix null pointer in candidate parsing", "Refactor CSS into modules",
            "Add accessibility ARIA tags", "Implement drag and drop file upload",
            "Add support for multiple calendars", "Fix date parsing across timezones",
            "Final polish for beta release"
        ]
        random.shuffle(commit_messages)

        files_to_modify = [
            "docs/api_specs.md",
            "src/utils/formatters.js",
            "src/utils/validators.js",
            "backend/mock_tests.py",
            "docs/architecture.md"
        ]

        # Ensure directories exist
        os.makedirs("docs", exist_ok=True)
        os.makedirs("src/utils", exist_ok=True)
        os.makedirs("backend", exist_ok=True)

        msg_index = 0

        for i in range(num_prs):
            pr_name = f"feature-update-{i+1}"
            print(f"Generating {pr_name} with {commits_per_pr[i]} commits...")
            
            run_git(["checkout", "-b", pr_name, base_branch])
            
            num_c = commits_per_pr[i]
            for j in range(num_c):
                commit_date = start_date + timedelta(days=random.randint(0, 13), hours=random.randint(0, 23))
                date_str = commit_date.isoformat()
                
                # Make a realistic file change
                file_to_mod = random.choice(files_to_modify)
                with open(file_to_mod, "a") as f:
                    f.write(f"\n// Update related to: {commit_messages[msg_index]}\n")
                    f.write(f"// Implementation details added on {date_str}\n")
                
                run_git(["add", file_to_mod])
                
                env = {
                    "GIT_AUTHOR_DATE": date_str,
                    "GIT_COMMITTER_DATE": date_str,
                }
                run_git(["commit", "-m", commit_messages[msg_index]], env=env)
                msg_index += 1
                
            run_git(["checkout", base_branch])
            
            merge_date = merge_start_date + timedelta(days=i)
            merge_date_str = merge_date.isoformat()
            env = {
                "GIT_AUTHOR_DATE": merge_date_str,
                "GIT_COMMITTER_DATE": merge_date_str,
            }
            print(f"Merging {pr_name} on {merge_date_str}...")
            
            # Using realistic PR titles
            pr_title = f"Feature Update Set #{i+1}"
            run_git(["merge", "--no-ff", pr_name, "-m", f"Merge pull request #{100 + i} from {pr_name}\n\n{pr_title}"], env=env)

        # Cleanup the dummy files so working directory stays clean
        run_git(["rm", "-f", "mock_history.txt"], check=False)
        run_git(["commit", "-m", "Cleanup mock history script artifacts"], check=False)

        print("Successfully generated realistic mock history!")

    finally:
        print("Restoring stashed changes...")
        subprocess.run(["git", "stash", "pop"])

if __name__ == "__main__":
    main()
