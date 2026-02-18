import { Router } from 'express'
import type { Request, Response } from 'express'
import { calculateShippingCost, getShippingOptions, getZoneFromCountry, isCarrierAvailableForZone } from '../utils'

const router = Router()

// =============================================
// GET /api/shipping/calculate — Public shipping cost preview
// Accepts optional country & zip query params for zone-based pricing
// =============================================
router.get('/api/shipping/calculate', (req: Request, res: Response) => {
  const weightGrams = parseInt(req.query.weight_grams as string, 10)
  const carrier = req.query.carrier as string
  const country = req.query.country as string | undefined
  const zip = req.query.zip as string | undefined

  if (!weightGrams || isNaN(weightGrams) || weightGrams <= 0) {
    res.status(400).json({ error: 'weight_grams must be a positive integer' })
    return
  }

  if (!carrier) {
    res.status(400).json({ error: 'carrier is required' })
    return
  }

  const validCarriers = ['mondial_relay', 'colissimo', 'chronopost', 'laposte']
  if (!validCarriers.includes(carrier)) {
    res.status(400).json({ error: `carrier must be one of: ${validCarriers.join(', ')}` })
    return
  }

  const zone = getZoneFromCountry(country, zip)

  // Check if carrier is available for this zone
  if (!isCarrierAvailableForZone(carrier, zone)) {
    res.status(400).json({
      error: `${carrier} is not available for zone: ${zone}`,
      zone,
    })
    return
  }

  const shippingCost = calculateShippingCost(weightGrams, carrier, zone)

  res.json({
    shipping_cost: shippingCost,
    carrier,
    weight_grams: weightGrams,
    zone,
  })
})

// =============================================
// GET /api/shipping/options — Get all carrier options for a weight
// Accepts optional country & zip query params for zone-based pricing
// =============================================
router.get('/api/shipping/options', (req: Request, res: Response) => {
  const weightGrams = parseInt(req.query.weight_grams as string, 10)
  const country = req.query.country as string | undefined
  const zip = req.query.zip as string | undefined

  if (!weightGrams || isNaN(weightGrams) || weightGrams <= 0) {
    res.status(400).json({ error: 'weight_grams must be a positive integer' })
    return
  }

  const zone = getZoneFromCountry(country, zip)
  const options = getShippingOptions(weightGrams, zone)

  res.json({
    weight_grams: weightGrams,
    zone,
    options,
  })
})

export default router
