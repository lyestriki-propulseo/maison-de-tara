import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">Maison de Tara</p>
        <h1 className="mt-3 text-3xl font-light text-neutral-800">
          La maison où l&apos;on prend le temps
        </h1>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Link
          to="/admin"
          className="bg-[#4A5D2E] px-8 py-4 text-xs uppercase tracking-[0.18em] text-[#F4EDE0] transition-colors hover:bg-[#3A4A24]"
        >
          Accéder à l&apos;admin
        </Link>
        <Link to="/login" className="text-xs text-neutral-500 underline hover:text-neutral-800">
          Se connecter avec un compte
        </Link>
      </div>
    </main>
  )
}
