import { Router } from 'express'
import type { Request, Response } from 'express'
import { calculateShippingCost, getCarrierForZone, getShippingOptions, getZoneFromCountry } from '../utils'

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

  const zone = getZoneFromCountry(country, zip)
  // Auto-determine carrier from zone (carrier param is optional/ignored)
  const autoCarrier = carrier || getCarrierForZone(zone)
  const shippingCost = calculateShippingCost(weightGrams, autoCarrier, zone)

  res.json({
    shipping_cost: shippingCost,
    carrier: autoCarrier,
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
