import zipcodes from 'zipcodes'

const MAX_DISTANCE_MILES = 200

interface ZipcodeData {
  zipCode: string
  distance: number
}

class ZipcodeService {
  constructor() {
    console.log("[ZipcodeService] Ready to use 'zipcodes' functions.")
  }

  async getGeocodeForZip(zipcode: string): Promise<any | null> {
    try {
      const data = zipcodes.lookup(zipcode)
      return data || null
    } catch (error) {
      console.error(`[ZipcodeService] Geocode fetch error for ${zipcode}:`, error)
      return null
    }
  }

  async getDistanceBetweenZips(zip1: string, zip2: string): Promise<number | null> {
    try {
      const distanceResult = zipcodes.distance(zip1, zip2)
      return distanceResult || null
    } catch (error) {
      console.warn(`[ZipcodeService] Could not calculate distance between ${zip1} and ${zip2}.`)
      return null
    }
  }

  async findNearbyZipcodes(sourceZipcode: string): Promise<string[]> {
    try {
      const nearbyZipsRaw = zipcodes.radius(sourceZipcode, MAX_DISTANCE_MILES) || []
      // Support both [string] and [{zip: string, ...}]
      const nearbyZips: string[] = nearbyZipsRaw.map((z: any) =>
        typeof z === 'string' ? z : z.zip,
      )

      if (!nearbyZips || nearbyZips.length === 0) {
        console.warn(
          `[ZipcodeService] 'zipcodes' returned 0 zips for ${sourceZipcode}. Returning only the source.`,
        )
        return [sourceZipcode]
      }

      if (!nearbyZips.includes(sourceZipcode)) {
        nearbyZips.push(sourceZipcode)
      }

      return nearbyZips
    } catch (error) {
      console.error(`[ZipcodeService] Error finding nearby zipcodes for ${sourceZipcode}:`, error)
      return [sourceZipcode]
    }
  }
}

export default ZipcodeService
