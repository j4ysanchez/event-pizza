interface UndoSnackbarProps {
  itemName: string
  onUndo: () => void
}

export function UndoSnackbar({ itemName, onUndo }: UndoSnackbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
      <span className="truncate max-w-[200px]">"{itemName}" removed</span>
      <button
        onClick={onUndo}
        className="text-red-400 font-semibold hover:text-red-300 shrink-0"
      >
        Undo
      </button>
    </div>
  )
}
