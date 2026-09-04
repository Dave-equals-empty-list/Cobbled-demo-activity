import { useEffect, useRef, useState } from 'react'

const ENDPOINT = '/api/users'

const STAGES = [
  { title: 'React form', detail: 'Reads the input and posts JSON' },
  { title: 'C# Web API', detail: 'POST /api/users' },
  { title: 'Stored procedure', detail: 'EXEC AddUser @Name' },
  { title: 'SQL Server', detail: 'Row written to Users, id returned' },
  { title: 'React display', detail: 'Shows the saved name in capitals' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [name, setName] = useState('')
  const [phase, setPhase] = useState('idle')
  const [stage, setStage] = useState(-1)
  const [sent, setSent] = useState(null)
  const [received, setReceived] = useState(null)
  const [elapsed, setElapsed] = useState(null)
  const [error, setError] = useState(null)
  const [stored, setStored] = useState([])
  const [storedError, setStoredError] = useState(null)
  const inputRef = useRef(null)

  // Reads the real contents of the Users table through GET /api/users
  async function loadStored() {
    try {
      const res = await fetch(ENDPOINT)
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      setStored(await res.json())
      setStoredError(null)
    } catch {
      setStoredError('Could not read the table — is the backend running?')
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
    loadStored()
  }, [])

  async function send(event) {
    event.preventDefault()
    if (!name.trim() || phase === 'running') return

    const payload = { name: name.trim() }
    setPhase('running')
    setStage(-1)
    setError(null)
    setReceived(null)
    setElapsed(null)
    setSent(payload)

    const started = performance.now()
    const call = fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    for (let i = 0; i < STAGES.length - 1; i++) {
      setStage(i)
      await sleep(260)
    }

    try {
      const res = await call
      const body = await res.json()
      const ms = Math.round(performance.now() - started)
      setElapsed(ms)

      if (!res.ok) throw new Error(body.error || `Backend returned ${res.status}.`)

      setStage(4)
      setReceived(body)
      setPhase('done')
      setName('')

      // Reread the table so the list below displays the database, not the browser
      await loadStored()
    } catch (err) {
      setElapsed(Math.round(performance.now() - started))
      setStage(-1)
      setPhase('error')
      setError(
        err instanceof TypeError
          ? 'No response from the backend. Check that dotnet run is still going on port 5000.'
          : err.message,
      )
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1 className="wordmark">Round trip</h1>
          <p className="tagline">One name, five hops, back on screen.</p>
        </div>
      </header>

      <main className="grid">
        <section className="left">
          <form className="card" onSubmit={send}>
            <label className="field">
              <span>Your name</span>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                maxLength={100}
                autoComplete="off"
              />
            </label>
            <button type="submit" disabled={!name.trim() || phase === 'running'}>
              {phase === 'running' ? 'Sending…' : 'Send to the database'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>

          <section className={`result ${phase === 'done' ? 'result-filled' : ''}`}>
            {received ? (
              <>
                <p className="shout">{received.name.toUpperCase()}</p>
                <p className="receipt">
                  saved as id {received.id} · {elapsed} ms round trip
                </p>
              </>
            ) : (
              <p className="result-empty">
                Send a name and it comes back from SQL Server in capitals.
              </p>
            )}
          </section>
        </section>

        <section className="rail" aria-live="polite">
          <ol>
            {STAGES.map((s, i) => {
              const state =
                phase === 'error' && i > 0 ? 'idle' : i < stage ? 'done' : i === stage ? 'live' : 'idle'
              return (
                <li key={s.title} className={state}>
                  <span className="marker">{i + 1}</span>
                  <div className="hop">
                    <h3>{s.title}</h3>
                    <p>{s.detail}</p>
                    {i === 1 && sent && <pre>{JSON.stringify(sent)}</pre>}
                    {i === 4 && received && <pre>{JSON.stringify(received)}</pre>}
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="footnote">
            The round-trip time is measured in the browser. The step timing is for readability.
          </p>
        </section>
      </main>

      <section className="stored">
        <h2>In the database</h2>
        {storedError && <p className="error">{storedError}</p>}
        {stored.length === 0 && !storedError ? (
          <p className="result-empty">
            The Users table is empty. Send a name to add the first row.
          </p>
        ) : (
          !storedError && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {stored.map((r) => (
                    <tr key={r.id}>
                      <td className="num">{r.id}</td>
                      <td>{r.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="footnote">
                Read from SQL Server via GET /api/users, which runs the GetUsers stored
                procedure. This survives a page refresh, because it is the table's actual
                contents.
              </p>
            </>
          )
        )}
      </section>
    </div>
  )
}
