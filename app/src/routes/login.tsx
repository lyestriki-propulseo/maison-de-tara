import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn } from '@/lib/auth'
import taraLogo from '../assets/mdt_logo_complet_transparent.png?url'
import './login.css'

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
    <main className="tara-login">
      <section className="tara-login__brand" aria-hidden="true">
        <div className="tara-login__brand-inner">
          <img className="tara-login__logo" src={taraLogo} alt="" />
          <p className="tara-login__eyebrow">Espace de gestion</p>
          <p className="tara-login__signature">Prendre le temps.</p>
        </div>
      </section>

      <section className="tara-login__panel">
        <form className="tara-login__form" onSubmit={onSubmit} noValidate>
          <header className="tara-login__head">
            <p className="tara-login__kicker">Administration — Maison de Tara</p>
            <h1>Bienvenue</h1>
            <p className="tara-login__sub">
              Connectez-vous pour gérer l'agenda et les rendez-vous.
            </p>
          </header>

          {error && (
            <p role="alert" className="tara-login__error">
              {error}
            </p>
          )}

          <div className="tara-field">
            <label htmlFor="login-email">Adresse e-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="vous@maisondetara.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="tara-field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="tara-login__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  )
}
