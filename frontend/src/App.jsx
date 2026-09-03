import { useEffect, useRef, useState } from 'react'

// Matches backend/CobbleNameDemo/Program.cs exactly. If the backend endpoint
// or the response shape changes, this file is the only place to update.
const ENDPOINT = '/api/users'

const STAGES = [
  { title: 'React form', detail: 'Reads the input and posts JSON' },
  { title: 'C# Web API', detail: 'POST /api/users' },
  { title: 'EF Core', detail: 'db.Users.Add then SaveChangesAsync' },
  { title: 'SQL Server', detail: 'Row written to Users, then read back' },
  { title: 'React display', detail: 'Shows the saved name in capitals' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const [name, setName] = useState('')
  const [phase, setPhase] = useState('idle') // idle | running | done | error
  const [stage, setStage] = useState(-1)
  const [sent, setSent] = useState(null)
  const [received, setReceived] = useState(null)
  const [elapsed, setElapsed] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
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

    // Stages 1-4 step forward on a fixed beat so the trip is readable.
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

      // The last stage only lights up once the real response is in hand.
      setStage(4)
      setReceived(body)
      setPhase('done')
      setName('')
      setHistory((h) => [{ ...body, ms, at: new Date() }, ...h])
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
        <h2>Sent this session</h2>
        {history.length === 0 ? (
          <p className="result-empty">Nothing sent yet. Each round trip lands here.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Name</th>
                  <th>Round trip</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={`${r.id}-${i}`}>
                    <td className="num">{r.id}</td>
                    <td>{r.name}</td>
                    <td className="num">{r.ms} ms</td>
                    <td className="num">{r.at.toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="footnote">
              This list is held in the browser. The ids come from the database, but the
              backend has no read-all endpoint yet, so refreshing clears it.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
