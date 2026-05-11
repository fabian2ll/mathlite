/**
 * App.jsx — Orquestador principal de MathLite.
 * Maneja el estado global y compone todos los componentes.
 */
import { useState, useCallback } from 'react'
import { S } from './styles/appStyles'
import { TEST_CASES, DEFAULT_CODE } from './constants/testCases'
import { runProgram } from './services/api'

// Componentes
import Titlebar from './components/Titlebar'
import EditorPanel from './components/EditorPanel'
import ConsolePanel from './components/ConsolePanel'
import TokensPanel from './components/TokensPanel'
import AnalysisPanel from './components/AnalysisPanel'
import ASTPanel from './components/ASTPanel'
import TestsPanel from './components/TestsPanel'

// ─── Tabs disponibles ─────────────────────────────────────────────────────────
const TABS = [
  { id:'tokens',   label:'tokens' },
  { id:'analysis', label:'análisis' },
  { id:'ast',      label:'árbol AST' },
  { id:'tests',    label:'casos de prueba' },
]

// ─── Componente principal ─────────────────────────────────────────────────────
export default function App() {
  const [code,       setCode]       = useState(DEFAULT_CODE)
  const [activeTab,  setActiveTab]  = useState('tokens')
  const [running,    setRunning]    = useState(false)
  const [result,     setResult]     = useState(null)
  const [conLines,   setConLines]   = useState([{ text:'-- listo. escribe un programa y presiona ejecutar.', cls:'c-dim' }])

  const addLine = useCallback((text, cls) => {
    setConLines(prev => [...prev, { text, cls: cls || 'c-w' }])
  }, [])

  // ── Ejecutar código ──────────────────────────────────────────────────────
  async function runCode(src) {
    const source = src ?? code
    if (!source.trim()) { addLine('-- nada que ejecutar.', 'c-dim'); return }

    setConLines([{ text:'── ejecutando ──────────────────', cls:'c-dim' }])
    setRunning(true)

    try {
      const data = await runProgram(source)
      setResult(data)

      data.output.forEach(line => addLine(line, 'c-print'))

      if (data.output.length === 0 && data.errors.length === 0) {
        addLine('-- (sin salida print)', 'c-dim')
      }
      if (data.errors.length > 0) {
        addLine('', '')
        data.errors.forEach(e => addLine(`[${e.phase}] línea ${e.line ?? '?'}: ${e.msg}`, 'c-err'))
      } else {
        addLine('', '')
        addLine('✓ ejecución completada sin errores', 'c-ok')
      }
    } catch (err) {
      addLine(`[red] Error de conexión: ${err.message}`, 'c-err')
      addLine('¿Está corriendo el backend?  cd backend && python main.py', 'c-warn')
    } finally {
      setRunning(false)
    }
  }

  // ── Acciones de test cases ───────────────────────────────────────────────
  function loadCode(id) {
    const t = TEST_CASES.find(x => x.id === id)
    if (t) setCode(t.code)
  }

  function loadAndRun(id) {
    const t = TEST_CASES.find(x => x.id === id)
    if (!t) return
    setCode(t.code)
    setActiveTab('tokens')
    setTimeout(() => runCode(t.code), 80)
  }

  // ── Limpiar editor ───────────────────────────────────────────────────────
  function handleClear() {
    setCode('')
    setResult(null)
    setConLines([{text:'-- consola limpia.', cls:'c-dim'}])
  }

  function handleClearConsole() {
    setConLines([{text:'-- consola limpia.', cls:'c-dim'}])
  }

  // ── Datos derivados ──────────────────────────────────────────────────────
  const tokens    = result?.tokens    || []
  const symbols   = result?.symbols   || []
  const errors    = result?.errors    || []
  const ast       = result?.ast       || null
  const astText   = result?.ast_text  || ''
  const nodeCount = result?.node_count || 0

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <Titlebar activeTab={activeTab} onTabChange={setActiveTab} tabs={TABS} />

      <div style={S.main}>
        {/* ── LEFT: EDITOR + CONSOLE ── */}
        <div style={S.left}>
          <EditorPanel
            code={code}
            onCodeChange={setCode}
            onRun={() => runCode()}
            running={running}
            errors={errors}
            onClear={handleClear}
          />
          <ConsolePanel conLines={conLines} onClear={handleClearConsole} />
        </div>

        {/* ── RIGHT: PANELS ── */}
        <div style={S.right}>
          {activeTab === 'tokens' && (
            <>
              <div style={S.editorHeader}>
                <span style={S.panelLabel}><b>análisis léxico</b> — flujo de tokens</span>
                <span style={{ fontSize:11, color:'var(--txt3)', fontFamily:"'JetBrains Mono', monospace", marginLeft:'auto' }}>
                  {tokens.filter(t=>t.type!=='EOF').length > 0 ? `${tokens.filter(t=>t.type!=='EOF').length} tokens` : ''}
                </span>
              </div>
              <TokensPanel tokens={tokens} />
            </>
          )}

          {activeTab === 'analysis' && (
            <AnalysisPanel tokens={tokens} symbols={symbols} errors={errors} />
          )}

          {activeTab === 'ast' && (
            <>
              <div style={S.editorHeader}>
                <span style={S.panelLabel}><b>árbol de sintaxis abstracta</b></span>
                <span style={{ fontSize:11, color:'var(--txt3)', fontFamily:"'JetBrains Mono', monospace", marginLeft:'auto' }}>
                  {nodeCount > 0 ? `${nodeCount} nodos` : ''}
                </span>
              </div>
              <ASTPanel ast={ast} astText={astText} nodeCount={nodeCount} />
            </>
          )}

          {activeTab === 'tests' && (
            <TestsPanel onLoadAndRun={loadAndRun} onLoad={loadCode} />
          )}
        </div>
      </div>
    </div>
  )
}
