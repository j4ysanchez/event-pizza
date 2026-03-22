import { useOperationsStream } from '../../api/sse/useOperationsStream'
import { KanbanBoard } from './KanbanBoard'

export function KitchenQueueView() {
  const { kanban, isConnected } = useOperationsStream()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Kitchen Queue</h1>
        <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
          {isConnected ? '● Live' : '○ Connecting...'}
        </span>
      </div>
      <KanbanBoard kanban={kanban} />
    </div>
  )
}
