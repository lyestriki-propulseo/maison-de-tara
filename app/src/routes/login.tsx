import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn } from '@/lib/auth'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const { error: signInError } = await signIn(email, password)
      if (signInError) return setError(signInError)
      navigate({ to: '/admin' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-24 flex max-w-sm flex-col gap-4">
      <h1 className="text-xl">Administration — Maison de Tara</h1>
      <input
        className="border p-2"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-label="Email"
      />
      <input
        className="border p-2"
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        aria-label="Mot de passe"
      />
      <button
        className="bg-black p-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Connexion en cours…' : 'Se connecter'}
      </button>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}
