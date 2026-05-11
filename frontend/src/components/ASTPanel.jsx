/**
 * ASTPanel — Muestra el árbol de sintaxis abstracta.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { S } from '../styles/appStyles'

let mermaidReady = false
let mermaidModulePromise = null

function escapeLabel(value) {
  return String(value ?? '')
    .replace(/"/g, '\\"')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function nodeLabel(node) {
  if (!node || typeof node !== 'object') return '?'
  const t = node.type ?? '?'
  if (t === 'Program') return 'Program'
  if (t === 'LetDecl') return `LetDecl: ${node.name ?? '?'}`
  if (t === 'FuncDef') return `FuncDef: ${node.name ?? '?'}`
  if (t === 'Block') return `Block[${(node.body || []).length}]`
  if (t === 'IfStmt') return 'IfStmt'
  if (t === 'WhileStmt') return 'WhileStmt'
  if (t === 'ReturnStmt') return 'ReturnStmt'
  if (t === 'PrintStmt') return 'PrintStmt'
  if (t === 'ExprStmt') return 'ExprStmt'
  if (t === 'BinOp') return `BinOp: ${node.op ?? '?'}`
  if (t === 'UnaryOp') return `UnaryOp: ${node.op ?? '?'}`
  if (t === 'FuncCall') return `FuncCall: ${node.name ?? '?'}`
  if (t === 'NumberNode') return `Number: ${node.value ?? '?'}`
  if (t === 'StringNode') return `String: "${node.value ?? ''}"`
  if (t === 'BoolNode') return `Bool: ${String(node.value)}`
  if (t === 'VarNode') return `Var: ${node.name ?? '?'}`
  return t
}

function nodeClass(node) {
  const t = node?.type
  if (t === 'Program') return 'rootNode'
  if (t === 'FuncDef' || t === 'FuncCall' || t === 'LetDecl') return 'funcNode'
  if (t === 'IfStmt' || t === 'WhileStmt' || t === 'Block') return 'controlNode'
  if (t === 'BinOp' || t === 'UnaryOp') return 'opNode'
  if (t === 'NumberNode' || t === 'StringNode' || t === 'BoolNode') return 'literalNode'
  if (t === 'VarNode') return 'varNode'
  if (t === 'ReturnStmt' || t === 'PrintStmt' || t === 'ExprStmt') return 'stmtNode'
  return 'defaultNode'
}

function childrenOf(node) {
  if (!node || typeof node !== 'object') return []
  const t = node.type
  const out = []

  if (t === 'Program') return node.body || []
  if (t === 'LetDecl' && node.value) out.push(node.value)
  if (t === 'FuncDef' && node.body) out.push(node.body)
  if (t === 'Block') return node.body || []
  if (t === 'IfStmt') {
    if (node.cond) out.push(node.cond)
    if (node.then) out.push(node.then)
    if (node.alt) out.push(node.alt)
  }
  if (t === 'WhileStmt') {
    if (node.cond) out.push(node.cond)
    if (node.body) out.push(node.body)
  }
  if (t === 'ReturnStmt' && node.value) out.push(node.value)
  if (t === 'PrintStmt' && node.value) out.push(node.value)
  if (t === 'ExprStmt' && node.expr) out.push(node.expr)
  if (t === 'BinOp') {
    if (node.left) out.push(node.left)
    if (node.right) out.push(node.right)
  }
  if (t === 'UnaryOp' && node.operand) out.push(node.operand)
  if (t === 'FuncCall') return node.args || []

  return out
}

function buildMermaidAst(ast) {
  if (!ast || typeof ast !== 'object' || !ast.type) return ''

  const lines = [
    'flowchart TD',
    'classDef rootNode fill:#7c3aed,stroke:#c4b5fd,stroke-width:2.5px,color:#f5f3ff,font-weight:bold;',
    'classDef funcNode fill:#0f766e,stroke:#5eead4,stroke-width:2px,color:#ecfeff;',
    'classDef controlNode fill:#1d4ed8,stroke:#93c5fd,stroke-width:2px,color:#eff6ff;',
    'classDef opNode fill:#b45309,stroke:#fcd34d,stroke-width:2px,color:#fffbeb;',
    'classDef literalNode fill:#065f46,stroke:#6ee7b7,stroke-width:1.8px,color:#ecfdf5;',
    'classDef varNode fill:#9f1239,stroke:#fda4af,stroke-width:1.8px,color:#fff1f2;',
    'classDef stmtNode fill:#334155,stroke:#cbd5e1,stroke-width:1.8px,color:#f8fafc;',
    'classDef defaultNode fill:#1f2937,stroke:#9ca3af,stroke-width:1.5px,color:#f9fafb;',
    'linkStyle default stroke:#94a3b8,stroke-width:1.8px,opacity:0.85;',
  ]
  let id = 0

  function visit(node, parentId = null) {
    const nodeId = `N${id++}`
    const label = escapeLabel(nodeLabel(node))
    const className = nodeClass(node)
    lines.push(`${nodeId}["${label}"]`)
    lines.push(`class ${nodeId} ${className}`)
    if (parentId) lines.push(`${parentId} --> ${nodeId}`)
    for (const child of childrenOf(node)) visit(child, nodeId)
  }

  visit(ast, null)
  return lines.join('\n')
}

export default function ASTPanel({ ast, astText, nodeCount }) {
  const graphDef = useMemo(() => buildMermaidAst(ast), [ast])
  const viewportRef = useRef(null)
  const graphRef = useRef(null)
  const [renderError, setRenderError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 })

  function clampZoom(value) {
    return Math.min(2.5, Math.max(0.45, value))
  }

  function zoomIn() {
    setZoom((z) => clampZoom(z + 0.15))
  }

  function zoomOut() {
    setZoom((z) => clampZoom(z - 0.15))
  }

  function resetView() {
    setZoom(1)
    const view = viewportRef.current
    if (view) {
      view.scrollTo({ left: 0, top: 0, behavior: 'smooth' })
    }
  }

  function handleWheelZoom(e) {
    if (!viewportRef.current) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => clampZoom(z + delta))
  }

  function handleMouseDown(e) {
    if (!viewportRef.current) return
    setIsDragging(true)
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    }
  }

  function handleMouseMove(e) {
    if (!dragRef.current.active || !viewportRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    viewportRef.current.scrollLeft = dragRef.current.scrollLeft - dx
    viewportRef.current.scrollTop = dragRef.current.scrollTop - dy
  }

  function handleMouseUp() {
    dragRef.current.active = false
    setIsDragging(false)
  }

  useEffect(() => {
    if (!graphDef || !graphRef.current) {
      setRenderError('')
      return
    }

    let active = true
    const renderId = `ast-${Date.now()}-${Math.floor(Math.random() * 100000)}`

    if (!mermaidModulePromise) {
      mermaidModulePromise = import('mermaid')
    }

    mermaidModulePromise
      .then(({ default: mermaid }) => {
        if (!mermaidReady) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: 'base',
            themeVariables: {
              background: '#0b1220',
              primaryTextColor: '#e5e7eb',
              lineColor: '#94a3b8',
              tertiaryColor: '#111827',
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            },
            flowchart: {
              curve: 'basis',
              htmlLabels: true,
              nodeSpacing: 42,
              rankSpacing: 62,
              padding: 10,
              useMaxWidth: false,
            },
          })
          mermaidReady = true
        }
        return mermaid.render(renderId, graphDef)
      })
      .then(({ svg, bindFunctions }) => {
        if (!active || !graphRef.current) return
        graphRef.current.innerHTML = svg
        if (bindFunctions) bindFunctions(graphRef.current)
        setRenderError('')
      })
      .catch((err) => {
        if (!active) return
        setRenderError(err?.message || 'No se pudo renderizar el AST con Mermaid')
      })

    return () => {
      active = false
    }
  }, [graphDef])

  if (!astText) {
    return (
      <div style={S.astWrap}>
        <div style={S.empty}>ejecuta un programa para ver el AST</div>
      </div>
    )
  }

  return (
    <div style={S.astWrap}>
      {!renderError && graphDef ? (
        <div
          style={{
            width: '100%',
            border: '1px solid #334155',
            borderRadius: 8,
            background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 45%, #020617 100%)',
            padding: 14,
            boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#cbd5e1' }}>
              zoom: {Math.round(zoom * 100)}% (rueda del mouse o botones)
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={zoomOut}
                style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
              >
                -
              </button>
              <button
                type="button"
                onClick={zoomIn}
                style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
              >
                +
              </button>
              <button
                type="button"
                onClick={resetView}
                style={{ background: '#0f766e', color: '#ecfeff', border: '1px solid #14b8a6', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
              >
                reset
              </button>
            </div>
          </div>
          <div
            ref={viewportRef}
            onWheel={handleWheelZoom}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              overflow: 'auto',
              maxHeight: '65vh',
              cursor: isDragging ? 'grabbing' : 'grab',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 6,
              background: 'rgba(2,6,23,0.3)',
            }}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: 'max-content',
                minWidth: '100%',
                padding: 10,
              }}
            >
              <div ref={graphRef} />
            </div>
          </div>
        </div>
      ) : (
        <pre style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, lineHeight:1.7, whiteSpace:'pre', color:'var(--txt)' }}>
          {astText}
        </pre>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--txt3)' }}>
        {renderError
          ? `Visualización Mermaid no disponible (${renderError}). Mostrando versión textual.`
          : `Visualización dinámica Mermaid (${nodeCount} nodos).`}
      </div>
    </div>
  )
}
