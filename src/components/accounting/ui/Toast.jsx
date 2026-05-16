import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Toast({ show, onClose, duration = 3000, children, type = 'default' }) {
  useEffect(() => {
    if (show && duration) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  if (!show) return null

  const bgColors = {
    default: 'bg-gray-900',
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-500',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
        <span>{children}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
