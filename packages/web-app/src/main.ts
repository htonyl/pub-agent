type ConnectionState = 'live' | 'saved' | 'reconnecting' | 'resync-required' | 'conflict'
type BlockKind = 'heading' | 'paragraph' | 'quote' | 'code' | 'list' | 'agent-proposal'

type Block = {
  id: string
  kind: BlockKind
  label: string
  actor: string
  content: string | string[]
  anchor: string
}

type Comment = {
  id: string
  author: string
  initials: string
  time: string
  text: string
  blockId: string
  resolved: boolean
}

type DocumentState = {
  id: string
  title: string
  subtitle: string
  status: 'in_review' | 'finalized'
  version: number
  updatedAt: string
  connection: ConnectionState
  blocks: Block[]
  comments: Comment[]
  history: { version: number; actor: string; time: string; summary: string }[]
  proposalPending: boolean
}

/** Adapter seam for the Worker REST/MCP/WebSocket integration. */
export interface DocumentTransport {
  loadDocument(documentId: string): Promise<DocumentState>
  saveDocument(document: DocumentState): Promise<{ version: number }>
  approveDocument(documentId: string, version: number): Promise<{ version: number; status: 'finalized' }>
  createReviewLink(documentId: string): Promise<{ url: string }>
  openCollaboration(documentId: string, onState: (state: ConnectionState) => void): { close(): void }
}

const icon = (name: string, size = 16) => {
  const paths: Record<string, string> = {
    grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4 4"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    share: '<circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 8-5M8 13l8 5"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6M12 7v5l3 1.8"/>',
    comment: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4.1A2.5 2.5 0 0 1 4 12.5z"/>',
    anchor: '<path d="M12 17v-7M9 13h6M8.5 7.5a3.5 3.5 0 1 1 7 0c0 1.3-.7 2.4-1.7 3.1"/><path d="M7.2 10.6a3.5 3.5 0 1 0 5.6 4.1"/>',
    bot: '<rect x="5" y="7" width="14" height="12" rx="3"/><path d="M12 3v4M8.5 12h.1M15.5 12h.1M9 16h6"/>',
    check: '<path d="m5 12 4.3 4.3L19 6.7"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    eye: '<path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.7-4L3 10M3 5v5h5M4 13a8 8 0 0 0 14.7 4L21 14m0 5v-5h-5"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  }
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? ''}</svg>`
}

const mockDocument: DocumentState = {
  id: 'doc-agent-publishing',
  title: 'Designing a durable publishing loop',
  subtitle: 'A field guide to turning agent output into knowledge people can trust, revisit, and build on.',
  status: 'in_review',
  version: 7,
  updatedAt: '4 min ago',
  connection: 'live',
  proposalPending: true,
  blocks: [
    { id: 'block-context', kind: 'paragraph', label: 'Context', actor: 'Tony Liang', anchor: 'context', content: 'Agent output becomes more useful when it leaves the conversation with its source, structure, and next review step intact. The publishing layer is the connective tissue between a good answer and a durable team memory.' },
    { id: 'block-principles', kind: 'heading', label: 'Heading', actor: 'Tony Liang', anchor: 'principles', content: 'Three principles for a trustworthy publishing loop' },
    { id: 'block-provenance', kind: 'list', label: 'List', actor: 'Asha · agent', anchor: 'provenance', content: ['Make provenance visible at the point of reading, not hidden in metadata.', 'Treat every agent edit as a proposal with a stable version and actor.', 'Give humans a focused review surface with an explicit acceptance moment.'] },
    { id: 'block-quote', kind: 'quote', label: 'Quote', actor: 'Tony Liang', anchor: 'quote', content: 'The best publishing workflow is the one that makes the next reader feel oriented before they feel impressed.' },
    { id: 'block-proposal', kind: 'agent-proposal', label: 'Agent proposal', actor: 'Asha · agent', anchor: 'proposal', content: 'Add a compact review state to every published document so readers can distinguish a living draft from a human-approved reference.', },
    { id: 'block-implementation', kind: 'heading', label: 'Heading', actor: 'Tony Liang', anchor: 'implementation', content: 'A small implementation surface' },
    { id: 'block-code', kind: 'code', label: 'Code', actor: 'Asha · agent', anchor: 'code', content: 'publish_page → version 7 → review link\n                         ↳ human approval → finalized' },
  ],
  comments: [
    { id: 'comment-1', author: 'Mina Chen', initials: 'MC', time: '12m', text: 'Can we make the source actor easier to scan in the reading column?', blockId: 'block-provenance', resolved: false },
    { id: 'comment-2', author: 'Tony Liang', initials: 'TL', time: '28m', text: 'This is the right acceptance boundary for the MVP.', blockId: 'block-proposal', resolved: false },
    { id: 'comment-3', author: 'Asha', initials: 'AS', time: '1h', text: 'I used the existing block anchor contract here.', blockId: 'block-code', resolved: false },
  ],
  history: [
    { version: 7, actor: 'Asha · agent', time: '4m ago', summary: 'Proposed review state' },
    { version: 6, actor: 'Tony Liang', time: '28m ago', summary: 'Refined acceptance boundary' },
    { version: 5, actor: 'Asha · agent', time: '1h ago', summary: 'Added implementation notes' },
  ],
}

class MockDocumentStore {
  private document: DocumentState = structuredClone(mockDocument)

  async loadDocument(): Promise<DocumentState> { return structuredClone(this.document) }

  async saveDocument(document: DocumentState): Promise<{ version: number }> {
    this.document = structuredClone({ ...document, version: document.version + 1, updatedAt: 'just now', connection: 'saved' })
    return { version: this.document.version }
  }

  async approveDocument(documentId: string, version: number): Promise<{ version: number; status: 'finalized' }> {
    if (documentId !== this.document.id || version !== this.document.version) throw new Error('Approval target is stale')
    this.document = structuredClone({ ...this.document, status: 'finalized', connection: 'saved', updatedAt: 'just now' })
    return { version, status: 'finalized' }
  }

  async createReviewLink(documentId: string): Promise<{ url: string }> {
    return { url: `${window.location.origin}/documents/${documentId}/review/v${this.document.version}` }
  }

  collaboration(onState: (state: ConnectionState) => void) {
    let open = true
    const timer = window.setTimeout(() => { if (open) onState('live') }, 700)
    return { close: () => { open = false; window.clearTimeout(timer) } }
  }
}

const store = new MockDocumentStore()
const mockTransport: DocumentTransport = {
  loadDocument: () => store.loadDocument(),
  saveDocument: (document) => store.saveDocument(document),
  approveDocument: (documentId, version) => store.approveDocument(documentId, version),
  createReviewLink: (documentId) => store.createReviewLink(documentId),
  openCollaboration: (_documentId, onState) => store.collaboration(onState),
}

const app = document.querySelector<HTMLDivElement>('#app')!
const announce = document.createElement('div')
announce.className = 'sr-only'
announce.setAttribute('aria-live', 'polite')
announce.setAttribute('aria-atomic', 'true')
document.body.append(announce)

let current: DocumentState
let showHistory = false
let commentsOpen = false
let stateMenuOpen = false
let activeFilter = ''

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)

const blockMeta = (block: Block) => `<div class="block-meta">${icon(block.kind === 'agent-proposal' ? 'bot' : block.kind === 'heading' ? 'grid' : 'anchor', 13)}<span>${block.label} · ${escapeHtml(block.actor)}</span><button class="block-anchor" data-anchor="${block.id}" aria-label="Copy anchor for ${escapeHtml(block.label)}">${icon('anchor', 14)}</button></div>`

const renderBlock = (block: Block) => {
  const content = typeof block.content === 'string' ? block.content : ''
  const body = block.kind === 'heading' ? `<h2>${escapeHtml(content)}</h2>`
    : block.kind === 'paragraph' ? `<p>${escapeHtml(content)}</p>`
      : block.kind === 'quote' ? `<blockquote class="quote-block">${escapeHtml(content)}<cite>— Field notes, v${current.version}</cite></blockquote>`
        : block.kind === 'code' ? `<pre class="code-block"><code>${escapeHtml(content)}</code></pre>`
          : block.kind === 'list' ? `<ul>${(block.content as string[]).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
            : `<div class="proposal-block"><div class="proposal-head"><span class="proposal-label"><span class="pending-dot"></span>${current.proposalPending ? 'Pending agent proposal' : 'Proposal reviewed'}</span><span class="version-context">v${current.version} · Asha</span></div><p>${escapeHtml(content)}</p>${current.proposalPending ? `<div class="proposal-diff"><span><del>Drafts disappear into the document.</del></span><span><ins>Proposals keep an explicit review boundary.</ins></span></div><div class="proposal-actions"><button class="primary-button" data-action="open-proposal">Review proposal</button><button class="secondary-button" data-action="keep-current">Keep current</button></div>` : '<p class="rail-caption">This proposal has been reviewed and is retained in version history.</p>'}</div>`
  return `<section id="${block.id}" class="document-block" data-block-id="${block.id}" data-anchor-name="${block.anchor}">${blockMeta(block)}${body}</section>`
}

const connectionLabel: Record<ConnectionState, { title: string; detail: string }> = {
  live: { title: 'Live', detail: 'Connected to workspace' },
  saved: { title: 'Saved', detail: 'All changes synced' },
  reconnecting: { title: 'Reconnecting', detail: 'Trying to restore the room' },
  'resync-required': { title: 'Resync required', detail: 'Latest document needs loading' },
  conflict: { title: 'Conflict detected', detail: 'Your version is behind' },
}

const renderStatus = () => {
  const status = connectionLabel[current.connection]
  return `<button class="connection-status" data-action="toggle-state-menu" aria-expanded="${stateMenuOpen}">${`<span class="status-dot ${current.connection}"></span>`}<span class="status-copy"><strong>${status.title}</strong><small>${status.detail}</small></span>${icon('chevron', 14)}</button>${stateMenuOpen ? `<div class="state-menu" role="menu"><button data-state="live" role="menuitem">Preview live state</button><button data-state="reconnecting" role="menuitem">Preview reconnecting</button><button data-state="resync-required" role="menuitem">Preview resync required</button><button data-state="conflict" role="menuitem">Preview conflict</button></div>` : ''}${current.connection === 'conflict' ? `<div class="conflict-panel" role="alert"><strong>Concurrent edit needs attention</strong>Another update landed while you were reviewing. Load the latest version to preserve both change sets.<br><button data-action="reload-latest">Load latest version</button></div>` : ''}`
}

const renderComments = () => current.comments.filter((comment) => !comment.resolved).map((comment) => `<li class="comment-item"><button data-jump="${comment.blockId}"><span class="comment-head"><strong>${escapeHtml(comment.author)}</strong><time>${comment.time}</time></span><p>${escapeHtml(comment.text)}</p><span class="comment-anchor">Jump to block ${comment.blockId.replace('block-', '#')}</span></button></li>`).join('')

const render = () => {
  const isFinalized = current.status === 'finalized'
  const recent = ['Designing a durable publishing loop', 'MCP capability guide', 'Q3 research notes'].filter((item) => item.toLowerCase().includes(activeFilter.toLowerCase()))
  app.innerHTML = `<a class="skip-link" href="#editor">Skip to editor</a><header class="topbar"><div class="brand"><span class="brand-mark">PA</span><span>Pub Agent <span class="brand-caption">workspace</span></span></div><div class="breadcrumb" aria-label="Breadcrumb"><span>Research</span>${icon('chevron', 13)}<strong>${escapeHtml(current.title)}</strong></div><div class="top-actions"><button class="icon-button" data-action="toggle-theme" aria-label="Toggle dark theme">${icon('sun', 17)}</button><button class="text-button" data-action="share">${icon('share', 15)} Share</button><span class="avatar" title="Tony Liang">TL</span></div></header><div class="app-shell"><aside class="left-rail" aria-label="Document navigation"><button class="workspace-switcher" aria-label="Switch workspace"><span class="workspace-glyph">R</span><span class="workspace-name">Research studio<small>Personal workspace</small></span>${icon('chevron', 13)}</button><div class="rail-divider"></div><button class="new-document" data-action="new-document">${icon('plus', 15)} New document</button><nav aria-label="Primary"><ul class="nav-list"><li><button class="nav-item" aria-current="page">${icon('grid', 15)} <span>Overview</span></button></li><li><button class="nav-item" data-action="toggle-comments">${icon('comment', 15)} <span>Review queue</span><span class="nav-count">2</span></button></li><li><button class="nav-item">${icon('check', 15)} <span>Published</span></button></li></ul></nav><h2 class="rail-heading"><span>Recent</span><span>⌘K</span></h2><label class="search-wrap">${icon('search', 15)}<span class="sr-only">Filter recent documents</span><input id="document-search" type="search" placeholder="Filter documents" value="${escapeHtml(activeFilter)}" /></label><ul class="recent-list">${recent.map((item, index) => `<li><button class="recent-item" ${index === 0 ? 'aria-current="page"' : ''}><span>${escapeHtml(item)}</span></button></li>`).join('')}</ul></aside><main id="editor" class="workspace-main" tabindex="-1"><div class="editor-toolbar"><div class="toolbar-context"><span class="eyebrow ${isFinalized ? 'is-finalized' : ''}">${isFinalized ? 'Finalized' : 'In review'}</span><span class="version-context">Version ${current.version} · updated ${current.updatedAt}</span></div><div class="toolbar-actions"><button class="text-button" data-action="toggle-history">${icon('history', 15)} History</button><button class="text-button" data-action="toggle-comments">${icon('comment', 15)} Comments ${current.comments.filter((comment) => !comment.resolved).length}</button><button class="primary-button" data-action="save" ${isFinalized ? 'disabled' : ''}>${icon('check', 15)} ${current.connection === 'saved' ? 'Saved' : 'Save draft'}</button></div></div><div class="main-grid"><article class="editor-pane" aria-labelledby="document-title"><header class="editor-header"><p class="document-kicker">Agent publishing / review</p><h1 id="document-title" class="document-title" contenteditable="true" role="textbox" aria-label="Document title">${escapeHtml(current.title)}</h1><p class="document-subtitle">${escapeHtml(current.subtitle)}</p><div class="provenance-strip"> <span class="provenance-icon">A</span><span><strong>Drafted with Asha · publishing agent</strong>Source: MCP publish_page · client update <code>upd_7f31</code><br />Human owner: Tony Liang · last reviewed 4 minutes ago</span></div></header><div id="document-blocks" class="block-stack">${current.blocks.map(renderBlock).join('')}</div><section class="approval-banner" aria-label="Review decision"><div><strong>${isFinalized ? 'Approved reference' : 'Ready for human approval'}</strong><p>${isFinalized ? `Version ${current.version} is finalized and agent edits are locked.` : `Approval targets exact version ${current.version}; later edits will require a new decision.`}</p></div><button class="primary-button" data-action="open-approve" ${isFinalized ? 'disabled' : ''}>${icon(isFinalized ? 'lock' : 'check', 15)} ${isFinalized ? 'Approved' : `Approve v${current.version}`}</button></section></article><aside class="review-rail" aria-label="Review and document details"><section class="rail-card"><h2>Document state</h2>${renderStatus()}</section><section class="rail-card"><h2>Provenance</h2><div class="rail-person"><span class="mini-avatar">A</span><span><strong>Asha · agent</strong><span>Publishing agent · MCP</span></span></div><p class="rail-caption">This document was created from a structured agent update. Every block keeps a stable anchor for follow-up context.</p><button class="rail-footer-link" data-action="copy-link">${icon('anchor', 14)} Copy document anchor</button></section><section class="rail-card" ${commentsOpen ? 'data-open="true"' : ''}><h2>Comments <span class="version-context">· ${current.comments.filter((comment) => !comment.resolved).length} open</span></h2><ul class="comment-list">${renderComments()}</ul><button class="rail-footer-link" data-action="add-comment">${icon('plus', 14)} Add comment</button></section>${showHistory ? `<section class="rail-card"><h2>Version history</h2><ol class="version-list">${current.history.map((item) => `<li class="version-item" aria-current="${item.version === current.version}"><span class="version-number">${item.version}</span><span><strong>${escapeHtml(item.actor)}</strong><br /><small>${escapeHtml(item.summary)}</small></span><small>${item.time}</small></li>`).join('')}</ol><button class="rail-footer-link" data-action="restore-version">${icon('refresh', 14)} Restore as new version</button></section>` : ''}</aside></div></main></div><div id="toast" class="toast" role="status" hidden></div><dialog id="approve-dialog"><div class="dialog-inner"><h2>Approve exact version ${current.version}?</h2><p>This is a deliberate review decision. You are approving the immutable content currently shown, including the agent proposal only if you have accepted it.</p><div class="dialog-note"><strong>Version ${current.version}</strong><br />${escapeHtml(current.title)}<br />Last updated ${current.updatedAt} · drafted by Asha</div><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">Keep reviewing</button><button class="primary-button" data-action="confirm-approve">Approve version ${current.version}</button></div></div></dialog><dialog id="proposal-dialog"><div class="dialog-inner"><h2>Review Asha’s proposal</h2><p>The proposal will be accepted as a new document version and remain attributed to the agent. You can still edit the resulting draft before approval.</p><div class="dialog-note"><strong>Suggested change</strong><br />Make the review boundary visible in every published document.</div><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">Keep reviewing</button><button class="primary-button" data-action="confirm-proposal">Accept proposal & create version</button></div></div></dialog>`
  app.setAttribute('aria-busy', 'false')
}

const toast = (message: string) => {
  const element = document.querySelector<HTMLDivElement>('#toast')!
  element.textContent = message
  element.hidden = false
  announce.textContent = message
  window.setTimeout(() => { element.hidden = true }, 3200)
}

const setConnection = (state: ConnectionState) => { current.connection = state; stateMenuOpen = false; render(); announce.textContent = `Document state: ${connectionLabel[state].title}` }

const openDialog = (id: string) => document.querySelector<HTMLDialogElement>(`#${id}`)?.showModal()
const closeDialogs = () => document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dialog) => dialog.close())

app.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement
  const actionTarget = target.closest<HTMLElement>('[data-action]')
  const action = actionTarget?.dataset.action
  if (action === 'toggle-state-menu') { stateMenuOpen = !stateMenuOpen; render() }
  if (action === 'toggle-history') { showHistory = !showHistory; render(); toast(showHistory ? 'Version history opened' : 'Version history closed') }
  if (action === 'toggle-comments') { commentsOpen = !commentsOpen; render(); if (commentsOpen) toast('Showing open comments') }
  if (action === 'open-approve') openDialog('approve-dialog')
  if (action === 'open-proposal') openDialog('proposal-dialog')
  if (action === 'close-dialog') closeDialogs()
  if (action === 'confirm-proposal') { closeDialogs(); current.proposalPending = false; current.updatedAt = 'just now'; current.connection = 'saved'; const result = await mockTransport.saveDocument(current); current.version = result.version; current.history.unshift({ version: current.version, actor: 'Tony Liang', time: 'just now', summary: 'Accepted Asha proposal' }); render(); toast(`Proposal accepted as version ${current.version}`) }
  if (action === 'confirm-approve') { try { await mockTransport.approveDocument(current.id, current.version); current.status = 'finalized'; current.connection = 'saved'; closeDialogs(); render(); toast(`Version ${current.version} approved and finalized`) } catch { setConnection('conflict'); closeDialogs(); toast('Approval target is stale. Load the latest version first.') } }
  if (action === 'save') { current.connection = 'saved'; const result = await mockTransport.saveDocument(current); current.version = result.version; current.history.unshift({ version: result.version, actor: 'Tony Liang', time: 'just now', summary: 'Saved document draft' }); render(); toast(`Draft saved as version ${result.version}`) }
  if (action === 'share') { const link = await mockTransport.createReviewLink(current.id); await navigator.clipboard?.writeText(link.url); toast('Review link copied to clipboard') }
  if (action === 'copy-link') { await navigator.clipboard?.writeText(`${window.location.origin}/documents/${current.id}#document-blocks`); toast('Document anchor copied') }
  if (action === 'add-comment') { commentsOpen = true; render(); toast('Comment composer is ready at the selected block') }
  if (action === 'reload-latest') { current = await mockTransport.loadDocument(current.id); setConnection('live'); toast(`Loaded latest version ${current.version}`) }
  if (action === 'keep-current') { current.proposalPending = false; render(); toast('Kept the current draft; proposal remains in history') }
  if (action === 'new-document') toast('New document flow would open here')
  if (action === 'toggle-theme') { const dark = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'light' : 'dark'; toast(`${dark ? 'Light' : 'Dark'} theme preview enabled`) }
  if (action === 'restore-version') { current.version += 1; current.updatedAt = 'just now'; current.history.unshift({ version: current.version, actor: 'Tony Liang', time: 'just now', summary: 'Restored v6 as new draft' }); render(); toast(`Restored as new version ${current.version}`) }
  const state = actionTarget?.dataset.state
  if (state) setConnection(state as ConnectionState)
  const jump = target.closest<HTMLElement>('[data-jump]')?.dataset.jump
  if (jump) document.getElementById(jump)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const anchor = target.closest<HTMLElement>('[data-anchor]')?.dataset.anchor
  if (anchor) { await navigator.clipboard?.writeText(`${window.location.href}#${anchor}`); toast(`Anchor copied for ${anchor.replace('block-', '')}`) }
})

app.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement
  if (target.id === 'document-search') { activeFilter = target.value; render(); document.querySelector<HTMLInputElement>('#document-search')?.focus(); document.querySelector<HTMLInputElement>('#document-search')?.setSelectionRange(activeFilter.length, activeFilter.length) }
  if (target.id === 'document-title') { current.title = target.textContent?.trim() || current.title }
})

const start = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 240))
  current = await mockTransport.loadDocument('doc-agent-publishing')
  render()
  mockTransport.openCollaboration(current.id, setConnection)
}

void start()
