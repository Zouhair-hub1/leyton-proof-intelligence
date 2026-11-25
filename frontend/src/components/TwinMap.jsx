import { useState } from 'react'
import { X, FileText, User, Building2, FolderOpen, Clock, Euro, BookOpen, Table2, Folder } from 'lucide-react'

const NODE_ICONS = {
  personne:    User,
  prestataire: Building2,
  projet:      FolderOpen,
  document:    FileText,
}

const DOC_ICONS = {
  clock:       Clock,
  euro:        Euro,
  book:        BookOpen,
  'file-text': FileText,
  file:        FileText,
  folder:      Folder,
  table:       Table2,
  user:        User,
}

// Positions fixes pour un layout propre
function getPositions(noeuds) {
  const projet = noeuds.find(n => n.type === 'projet')
  if (!projet) return {}

  const positions = {}
  const cx = 440, cy = 220 // centre du SVG
  positions[projet.id] = { x: cx, y: cy }

  const others = noeuds.filter(n => n.id !== projet.id)
  const count  = others.length
  const radius = 160

  // Disposition en éventail autour du centre
  const angleStep = count > 1 ? (2 * Math.PI) / count : 0
  const startAngle = -Math.PI / 2

  others.forEach((n, i) => {
    const angle = startAngle + i * angleStep
    positions[n.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })

  return positions
}

export default function TwinMap({ jumeau, alertes = [] }) {
  const [selected, setSelected] = useState(null)

  if (!jumeau || !jumeau.noeuds || jumeau.noeuds.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-10 flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-[#00b4d8]/10 flex items-center justify-center">
          <FolderOpen size={20} className="text-[#00b4d8]" />
        </div>
        <p className="text-white/40 text-sm">Le jumeau documentaire sera construit automatiquement après l'analyse des documents.</p>
      </div>
    )
  }

  const { noeuds, liens } = jumeau
  const positions = getPositions(noeuds)

  // Nœuds avec alerte
  const alerteSources = alertes.flatMap(a => a.sources || [])

  const W = 880, H = 440
  const NODE_W = 130, NODE_H = 56

  return (
    <div className="bg-[#f8fafc] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
          </svg>
        </div>
        <div>
          <p className="text-gray-800 font-semibold text-sm">Carte des preuves reliées</p>
          <p className="text-gray-400 text-xs">Cliquez sur un nœud pour voir son rôle, son statut et ses sources</p>
        </div>
      </div>

      {/* SVG */}
      <div className="relative bg-[#f8fafc]">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">

          {/* Lignes de connexion */}
          {liens.map((l, i) => {
            const from = positions[l.from]
            const to   = positions[l.to]
            if (!from || !to) return null

            const fromNode = noeuds.find(n => n.id === l.from)
            const isAlert  = fromNode?.sources?.some(s => alerteSources.includes(s))
            const isLateral = l.lateral === true

            // Milieu de la ligne pour le label
            const mx = (from.x + to.x) / 2
            const my = (from.y + to.y) / 2

            return (
              <g key={i}>
                <line
                  x1={from.x} y1={from.y}
                  x2={to.x}   y2={to.y}
                  stroke={isAlert ? '#f59e0b' : isLateral ? '#6366f1' : '#cbd5e1'}
                  strokeWidth={isAlert ? 2.5 : isLateral ? 1.5 : 1.5}
                  strokeDasharray={isLateral ? '5 3' : 'none'}
                  opacity={isLateral ? 0.6 : 0.8}
                />
                {/* Label sur les liens latéraux */}
                {isLateral && l.label && (
                  <g>
                    <rect
                      x={mx - 28} y={my - 9}
                      width={56} height={16}
                      rx={4}
                      fill="white"
                      stroke="#e2e8f0"
                      strokeWidth={1}
                    />
                    <text
                      x={mx} y={my + 3}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#6366f1"
                      fontFamily="system-ui, sans-serif"
                      fontWeight="500"
                    >
                      {l.label}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Nœuds */}
          {noeuds.map(node => {
            const pos = positions[node.id]
            if (!pos) return null

            const isProjet  = node.type === 'projet'
            const isSelected = selected?.id === node.id
            const hasAlerte  = node.sources?.some(s => alerteSources.includes(s))

            const x = pos.x - NODE_W / 2
            const y = pos.y - NODE_H / 2

            const Icon = node.type === 'document'
              ? (DOC_ICONS[node.icon] || FileText)
              : (NODE_ICONS[node.type] || FileText)

            return (
              <g
                key={node.id}
                onClick={() => setSelected(isSelected ? null : node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Ombre */}
                <rect
                  x={x + 2} y={y + 2}
                  width={NODE_W} height={NODE_H}
                  rx={isProjet ? 10 : 8}
                  fill="rgba(0,0,0,0.08)"
                />

                {/* Fond nœud */}
                <rect
                  x={x} y={y}
                  width={NODE_W} height={NODE_H}
                  rx={isProjet ? 10 : 8}
                  fill={isProjet ? '#1e3a5f' : 'white'}
                  stroke={isSelected ? '#3b82f6' : hasAlerte ? '#f59e0b' : isProjet ? '#1e3a5f' : '#e2e8f0'}
                  strokeWidth={isSelected ? 2.5 : hasAlerte ? 2 : 1}
                />

                {/* Icône */}
                <foreignObject x={x + 10} y={y + 10} width={20} height={20}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={isProjet ? '#93c5fd' : hasAlerte ? '#f59e0b' : '#64748b'} />
                  </div>
                </foreignObject>

                {/* Label */}
                <text
                  x={x + 34} y={y + 22}
                  fontSize={11}
                  fontWeight="600"
                  fill={isProjet ? 'white' : '#1e293b'}
                  fontFamily="system-ui, sans-serif"
                >
                  {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                </text>

                {/* Sublabel */}
                <text
                  x={x + 34} y={y + 36}
                  fontSize={9.5}
                  fill={isProjet ? '#93c5fd' : '#94a3b8'}
                  fontFamily="system-ui, sans-serif"
                >
                  {node.sublabel?.length > 16 ? node.sublabel.slice(0, 15) + '…' : node.sublabel}
                </text>

                {/* Badge alerte */}
                {hasAlerte && (
                  <circle cx={x + NODE_W - 8} cy={y + 8} r={5} fill="#f59e0b" />
                )}
              </g>
            )
          })}
        </svg>

        {/* Panneau détail nœud sélectionné */}
        {selected && (
          <div className="absolute top-4 right-4 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = selected.type === 'document'
                    ? (DOC_ICONS[selected.icon] || FileText)
                    : (NODE_ICONS[selected.type] || FileText)
                  return <Icon size={15} className="text-blue-500" />
                })()}
                <span className="text-gray-800 font-semibold text-sm">{selected.label}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Rôle</span>
                <span className="text-gray-700 font-medium capitalize">{selected.sublabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="text-gray-700 font-medium capitalize">{selected.type}</span>
              </div>
              {selected.statut && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Statut</span>
                  <span className={`font-medium ${selected.statut === 'ok' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {selected.statut === 'ok' ? '✓ Validé' : '⚠ À vérifier'}
                  </span>
                </div>
              )}
              {selected.sources?.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Sources</p>
                  {selected.sources.map(s => (
                    <div key={s} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mt-1 truncate">{s}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
