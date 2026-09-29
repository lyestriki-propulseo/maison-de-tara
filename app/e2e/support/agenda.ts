import { expect } from '@playwright/test'
import { slotAriaPrefix } from './db'
import type { Page } from '@playwright/test'
import type { Slot } from './db'

// Ouvre l'agenda et sélectionne le créneau donné (avance semaine par semaine si besoin).
export async function openSlot(page: Page, slot: Slot) {
  await page.goto('/admin/agenda')
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible()
  const cell = page.getByRole('button', { name: new RegExp(`^${slotAriaPrefix(slot)},`) })
  for (let week = 0; week < 20 && !(await cell.isVisible()); week += 1) {
    await page.getByRole('button', { name: 'Semaine suivante' }).click()
  }
  await cell.click()
  return cell
}
