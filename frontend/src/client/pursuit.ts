import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"

export type PursuitAssessment = {
  opportunity_name: string
  relationship_strength: number
  fit: number
  timing: number
  budget_realism: number
  competitive_position: number
  delivery_risk: number
  differentiators: number
  notes?: string | null
}

export type PursuitDimensionScore = {
  label: string
  score: number
  max_score: number
  rationale: string
}

export type PursuitRecommendation = {
  opportunity_name: string
  recommendation: "Pursue" | "Shape" | "Walk Away"
  overall_score: number
  summary: string
  dimensions: Array<PursuitDimensionScore>
  actions: Array<string>
}

export class PursuitService {
  /**
   * Assess Pursuit
   * Assess an opportunity and return a pursue / shape / walk-away recommendation.
   * @param data The data for the request.
   * @param data.requestBody
   * @returns PursuitRecommendation Successful Response
   * @throws ApiError
   */
  public static assessPursuit(data: {
    requestBody: PursuitAssessment
  }): CancelablePromise<PursuitRecommendation> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/pursuit/assess",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }
}
