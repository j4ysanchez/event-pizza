import { Outlet, NavLink } from 'react-router-dom'
import { ChefHat, BarChart3 } from 'lucide-react'

export function StaffLayout() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 h-14 flex items-center px-4 gap-6">
        <span className="flex items-center gap-2 font-bold text-white">
          <ChefHat size={20} />
          Staff Dashboard
        </span>
        <nav className="flex gap-4 text-sm">
          <NavLink
            to="/staff/kitchen"
            className={({ isActive }) =>
              isActive ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
            }
          >
            Kitchen Queue
          </NavLink>
          <NavLink
            to="/staff/manager"
            className={({ isActive }) =>
              isActive ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
            }
          >
            <span className="flex items-center gap-1">
              <BarChart3 size={14} /> Manager
            </span>
          </NavLink>
        </nav>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
