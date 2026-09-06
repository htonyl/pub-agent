import journal from './meta/_journal.json' with { type: 'json' }
import m0000 from './0000_perpetual_ogun.sql'

export default {
  journal,
  migrations: {
    m0000,
  },
}
