import { Router } from 'express'
import type { Request, Response } from 'express'
import { calculateShippingCost, getShippingOptions } from '../utils'

const router = Router()

// =============================================
// GET /api/shipping/calculate — Public shipping cost preview
// =============================================
router.get('/api/shipping/calculate', (req: Request, res: Response) => {
  const weightGrams = parseInt(req.query.weight_grams as string, 10)
  const carrier = req.query.carrier as string

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

  const shippingCost = calculateShippingCost(weightGrams, carrier)

  res.json({
    shipping_cost: shippingCost,
    carrier,
    weight_grams: weightGrams,
  })
})

// =============================================
// GET /api/shipping/options — Get all carrier options for a weight
// =============================================
router.get('/api/shipping/options', (req: Request, res: Response) => {
  const weightGrams = parseInt(req.query.weight_grams as string, 10)

  if (!weightGrams || isNaN(weightGrams) || weightGrams <= 0) {
    res.status(400).json({ error: 'weight_grams must be a positive integer' })
    return
  }

  const options = getShippingOptions(weightGrams)

  res.json({
    weight_grams: weightGrams,
    options,
  })
})

export default router
