# AI-as-a-Service

Instruction on how to get the project up and running.

## Prerequisites

Ollama must be installed on the current user's machine.
This can be setup either as a docker container or on the actual machine.

```bash
npm install
npm run db:start # Start the database container (make sure you aren't running PostgresSQL locally as they will conflict.)
npm run db:push # This will push the table creation alongside the some initial values within the database
```
(or `pnpm install` or `yarn`).
This installs all dependencies of the project.

## Running the application

```bash
npm run dev

# Or start the server and open the app in a new browser tab
npm run dev -- --open
```

