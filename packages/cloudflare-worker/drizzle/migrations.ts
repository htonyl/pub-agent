import journal from './meta/_journal.json' with { type: 'json' }
import m0000 from './0000_perpetual_ogun.sql'
import m0001 from './0001_collaborative_documents.sql'
import m0002 from './0002_document_hashes.sql'

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
  },
}
