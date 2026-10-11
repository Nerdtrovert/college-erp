
  ### 1. A Brand New Developer

  Command: npm run db:setup

  • Why: They have absolutely nothing on their machine. This command starts the Docker database for them, builds the schema from
  scratch, and injects all the mock data so they can log in immediately.
  • When: On their very first day cloning the repo.

  ### 2. A Developer with Existing Mock Data & an Older DB

  Command: npm run db:sync

  • Why: Let's say you just added the new "Backlogs" feature, and your teammate pulls your code. Their database doesn't have the

  
  backlog columns yet, but they don't want to lose the test students they've been creating. db:sync will safely inject your new
  columns into their database without wiping their test data.
  • When: Whenever they pull new code from GitHub that includes changes to the schema.prisma file.







