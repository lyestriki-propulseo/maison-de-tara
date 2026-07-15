import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Welcome } from '@/components/Welcome'

test('affiche le nom de la maison', () => {
  render(<Welcome maison="Maison de Tara" />)
  expect(screen.getByRole('heading')).toHaveTextContent('Maison de Tara')
})
