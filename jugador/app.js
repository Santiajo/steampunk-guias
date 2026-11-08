(function () {
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } },
  }

  // Tabs: arrow keys move between them, like a native tab strip.
  document.querySelectorAll('.tabs').forEach((tabs) => {
    const buttons = [...tabs.querySelectorAll('[role="tab"]')]
    const select = (b) => {
      buttons.forEach((x) => {
        const on = x === b
        x.setAttribute('aria-selected', on)
        x.tabIndex = on ? 0 : -1
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on
      })
    }
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(b))
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
        if (!d) return
        e.preventDefault()
        const next = buttons[(i + d + buttons.length) % buttons.length]
        select(next)
        next.focus()
      })
    })
    select(buttons[0])
  })

  // Section index: highlights where you are.
  const links = [...document.querySelectorAll('.toc a')]
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean)
  const mark = (id) =>
    links.forEach((a) => {
      const on = a.getAttribute('href') === '#' + id
      a.classList.toggle('on', on)
      if (on && window.matchMedia('(max-width: 860px)').matches)
        a.scrollIntoView({ block: 'nearest', inline: 'center' })
    })
  if ('IntersectionObserver' in window) {
    const seen = new Map()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null))
        const top = [...seen.entries()].filter(([, t]) => t !== null).sort((a, b) => a[1] - b[1])[0]
        if (top) mark(top[0])
      },
      { rootMargin: '-120px 0px -55% 0px' },
    )
    sections.forEach((s) => io.observe(s))
  }
  if (location.hash) mark(location.hash.slice(1))

  // Search: keeps the sections that mention the words, with the words marked.
  const input = document.getElementById('buscar')
  const main = document.querySelector('main')
  const empty = document.querySelector('.empty')
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const clear = () =>
    main.querySelectorAll('mark.hit').forEach((m) => m.replaceWith(document.createTextNode(m.textContent)))
  function highlight(root, q) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    nodes.forEach((n) => {
      const i = fold(n.nodeValue).indexOf(q)
      if (i < 0 || n.parentElement.closest('button[role="tab"], script, style')) return
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + q.length)
      const m = document.createElement('mark')
      m.className = 'hit'
      r.surroundContents(m)
    })
  }
  input?.addEventListener('input', () => {
    clear()
    main.normalize()
    const q = fold(input.value.trim())
    document.body.classList.toggle('searching', !!q)
    let shown = 0
    main.querySelectorAll('[data-search]').forEach((s) => {
      const hit = !q || fold(s.textContent).includes(q)
      s.hidden = !hit
      if (hit) shown++
      if (hit && q) {
        // Show the panel and the answer that hold the words.
        s.querySelectorAll('[role="tabpanel"]').forEach((p) => {
          if (fold(p.textContent).includes(q))
            document.querySelector(`[aria-controls="${p.id}"]`)?.click()
        })
        s.querySelectorAll('details.qa').forEach((d) => { if (fold(d.textContent).includes(q)) d.open = true })
        if (q.length > 1) highlight(s, q)
      }
    })
    empty.classList.toggle('show', !!q && shown === 0)
  })

  // Screenshots open large.
  const zoom = document.querySelector('dialog.zoom')
  document.querySelectorAll('figure.shot button').forEach((b) =>
    b.addEventListener('click', () => {
      const img = b.querySelector('img')
      zoom.querySelector('img').src = img.src
      zoom.querySelector('img').alt = img.alt
      zoom.showModal()
    }),
  )
  zoom?.addEventListener('click', (e) => { if (e.target === zoom) zoom.close() })

  // Checklist: remembered in this browser only.
  document.querySelectorAll('[data-checklist]').forEach((list) => {
    const key = 'guia:' + list.dataset.checklist
    const saved = store.get(key) || {}
    const boxes = [...list.querySelectorAll('input[type="checkbox"]')]
    const bar = list.parentElement.querySelector('.bar i')
    const count = list.parentElement.querySelector('[data-count]')
    const paint = () => {
      const done = boxes.filter((b) => b.checked).length
      if (bar) bar.style.width = (100 * done) / boxes.length + '%'
      if (count) count.textContent = `${done} de ${boxes.length}`
    }
    boxes.forEach((b) => {
      b.checked = !!saved[b.id]
      b.addEventListener('change', () => {
        saved[b.id] = b.checked
        store.set(key, saved)
        paint()
      })
    })
    paint()
  })
})()

// Images above a linked section can move it while they load: jump there again once loaded.
window.addEventListener('load', () => {
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
})
