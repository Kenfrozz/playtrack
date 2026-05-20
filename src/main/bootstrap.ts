import { runMigrations } from './database/migrations'
import { registerAllHandlers } from './ipc/register'

export function bootstrap(): void {
  runMigrations()
  registerAllHandlers()
}
