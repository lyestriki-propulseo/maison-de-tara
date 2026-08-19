import { expect, test } from 'vitest'
import {
  newsletterConfirmation,
  reservationAlertForTara,
  reservationConfirmationForCustomer,
  requestAlertForTara,
  requestConfirmationForCustomer,
} from './templates'

test('reservationAlertForTara inclut le nom du client et le lien admin', () => {
  const { subject, html } = reservationAlertForTara({
    customerName: 'Jeanne Martin',
    partySize: 4,
    targetLabel: 'Atelier libre · 2026-09-01 10:00',
    customerEmail: 'jeanne@example.com',
    customerPhone: '0600000000',
  })
  expect(subject).toContain('Jeanne Martin')
  expect(html).toContain('Jeanne Martin')
  expect(html).toContain('4')
  expect(html).toContain('jeanne@example.com')
  expect(html).toContain('0600000000')
  expect(html).toContain('/admin/reservations')
})

test('reservationConfirmationForCustomer mentionne le rappel acompte', () => {
  const { html } = reservationConfirmationForCustomer({
    customerName: 'Jeanne',
    targetLabel: 'Atelier libre · 2026-09-01 10:00',
  })
  expect(html).toContain('acompte')
})

test('newsletterConfirmation contient le lien de confirmation', () => {
  const { html } = newsletterConfirmation({ confirmUrl: 'https://admin.maisondetara.propulseo-site.com/newsletter/confirm?token=abc' })
  expect(html).toContain('https://admin.maisondetara.propulseo-site.com/newsletter/confirm?token=abc')
})

test('requestAlertForTara distingue contact et privatisation', () => {
  const { subject } = requestAlertForTara({
    requestType: 'privatisation',
    name: 'Paul',
    email: 'paul@example.com',
    phone: null,
    message: 'Anniversaire',
    partySize: 15,
    desiredDate: '2026-12-01',
    eventType: 'soiree',
  })
  expect(subject.toLowerCase()).toContain('privatisation')
})

test('requestConfirmationForCustomer accuse réception', () => {
  const { html } = requestConfirmationForCustomer({ name: 'Paul', requestType: 'contact' })
  expect(html).toContain('bien reçu')
})
