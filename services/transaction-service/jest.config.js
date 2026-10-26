{
  "executor": "nx:run-commands",
  "options": {
    "command": "pnpm exec jest --config services/transaction-service/jest.config.js --runInBand",
    "cwd": "."
  }
}