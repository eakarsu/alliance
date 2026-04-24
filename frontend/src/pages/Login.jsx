import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, Crown, ClipboardList, Cpu, Building2, Palette, Package, Globe, Lock } from 'lucide-react'

const quickUsers = [
  { name: 'Fetih', email: 'fetih@alliance.com', role: 'Founding Orchestrator', subtitle: 'Core Governance', icon: Crown, color: 'from-amber-500 to-amber-600' },
  { name: 'Muhittin', email: 'muhittin@alliance.com', role: 'PMO Coordinator', subtitle: 'Alliance Coordination', icon: ClipboardList, color: 'from-indigo-500 to-indigo-600' },
  { name: 'Erol', email: 'erol@alliance.com', role: 'Solution Architect', subtitle: 'Integration Lead', icon: Cpu, color: 'from-blue-500 to-blue-600' },
  { name: 'Gökhan', email: 'gokhan@alliance.com', role: 'Enterprise Partner', subtitle: 'Channel Bridge', icon: Building2, color: 'from-emerald-500 to-emerald-600' },
  { name: 'Yasin', email: 'yasin@alliance.com', role: 'Product Experience', subtitle: 'Chatbot/Conversion', icon: Palette, color: 'from-pink-500 to-pink-600' },
  { name: 'İbrahim', email: 'ibrahim@alliance.com', role: 'Product Partner', subtitle: 'Regional Licensing', icon: Package, color: 'from-orange-500 to-orange-600' },
  { name: 'Michael', email: 'michael@alliance.com', role: 'US Market Bridge', subtitle: 'Consulting Delivery', icon: Globe, color: 'from-cyan-500 to-cyan-600' },
  { name: 'Archie', email: 'archie@alliance.com', role: 'Restricted External', subtitle: 'Referral Contact', icon: Lock, color: 'from-gray-500 to-gray-600' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (user) => {
    setEmail(user.email)
    setPassword('alliance123')
    setError('')
    setLoading(true)
    try {
      await login(user.email, 'alliance123')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
              <span className="text-2xl font-bold text-white">A</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Alliance CRM</h1>
            <p className="mt-2 text-slate-400">Partner Relationship Management</p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@alliance.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-center text-sm font-medium text-slate-400">Quick Login</p>
            <div className="grid grid-cols-2 gap-2">
              {quickUsers.map((u) => (
                <button
                  key={u.email}
                  onClick={() => handleQuickLogin(u)}
                  disabled={loading}
                  className={`group flex items-center gap-2 rounded-xl bg-gradient-to-r ${u.color} p-3 text-left text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50`}
                >
                  <div className="rounded-lg bg-white/20 p-1.5">
                    <u.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{u.name}</p>
                    <p className="truncate text-[10px] text-white/75">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
