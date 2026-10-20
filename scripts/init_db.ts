// Inicializa la base de datos (esquema + datos semilla) y sale.
// Uso: bun scripts/init_db.ts
import 'dotenv/config'
import { ensureDatabase } from '../src/lib/bootstrap'

ensureDatabase()
  .then(() => {
    console.log('Base de datos lista ✅')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Error inicializando BD:', e)
    process.exit(1)
  })
