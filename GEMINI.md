# Autonomous Execution & Workspace Permissions

> **Workspace:** `workflow manager`  
> **Policy:** Full Autonomous Execution

## Directives
1. **Full Workspace Authorization**: The user has authorized all file operations, package management, test executions, and terminal commands within this project directory.
2. **Zero Unnecessary Prompts**: Do not prompt the user or ask for approval for standard development actions (running tests, executing shell commands, refactoring files, installing dependencies).
3. **Automated Verification**: Automatically run builds, static analysis, unit tests, and end-to-end tests when making code changes, and fix any failures autonomously.
4. **Direct Delivery**: Proceed directly to execution and present finalized solutions and reports without asking for intermediate confirmation.
