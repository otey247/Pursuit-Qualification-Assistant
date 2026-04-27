import { expect, type Page, test } from "@playwright/test"

async function selectScore(
  page: Page,
  field: string,
  optionLabel: string,
): Promise<void> {
  await page.getByTestId(`${field}-select`).click()
  await page.getByRole("option", { name: optionLabel }).click()
}

test.use({ storageState: { cookies: [], origins: [] } })

test("Assess a pursuit opportunity and reset the form", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "test-token")
  })

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        created_at: "2026-04-26T00:00:00Z",
        email: "test-user@example.com",
        full_name: "Test User",
        id: "6d0c1d5a-f219-4c09-b0c9-bbf171f405d0",
        is_active: true,
        is_superuser: false,
      }),
      contentType: "application/json",
      status: 200,
    })
  })

  await page.route("**/api/v1/pursuit/assess", async (route) => {
    const payload = route.request().postDataJSON()

    expect(payload.relationship_strength).toBe(5)
    expect(payload.fit).toBe(5)
    expect(payload.timing).toBe(4)
    expect(payload.budget_realism).toBe(4)
    expect(payload.competitive_position).toBe(4)
    expect(payload.delivery_risk).toBe(4)
    expect(payload.differentiators).toBe(5)

    await route.fulfill({
      body: JSON.stringify({
        actions: [
          "Assign a dedicated capture manager and pursuit team.",
          "Develop a detailed win strategy and competitive positioning plan.",
        ],
        dimensions: [
          {
            label: "Relationship Strength",
            max_score: 5,
            rationale:
              "Trusted advisor status; strong advocate inside the account.",
            score: 5,
          },
          {
            label: "Opportunity Fit",
            max_score: 5,
            rationale:
              "Excellent fit; squarely in our sweet spot with strong references.",
            score: 5,
          },
        ],
        opportunity_name: payload.opportunity_name,
        overall_score: 4.43,
        recommendation: "Pursue",
        summary:
          "'ACME Corp – Digital Transformation' is a strong opportunity. Commit pursuit resources.",
      }),
      contentType: "application/json",
      status: 200,
    })
  })

  await page.goto("/pursuit")

  await expect(
    page.getByRole("heading", { name: "Pursuit Qualifier" }),
  ).toBeVisible()

  await page
    .getByTestId("opportunity-name-input")
    .fill("ACME Corp – Digital Transformation")

  await selectScore(
    page,
    "relationship_strength",
    "5 – Trusted advisor / advocate",
  )
  await selectScore(page, "fit", "5 – Perfect fit / sweet spot")
  await selectScore(page, "timing", "4 – Good timing")
  await selectScore(page, "budget_realism", "4 – Reasonable and aligned")
  await selectScore(page, "competitive_position", "4 – Strong position")
  await selectScore(page, "delivery_risk", "4 – Low-moderate risk")
  await selectScore(page, "differentiators", "5 – Unique and compelling")

  await page.getByRole("button", { name: "Generate Recommendation" }).click()

  await expect(page.getByTestId("recommendation-badge")).toHaveText("Pursue")
  await expect(page.getByText("Dimension Breakdown")).toBeVisible()
  await expect(page.getByText("Recommended Actions")).toBeVisible()
  await expect(
    page.getByText("Assign a dedicated capture manager and pursuit team."),
  ).toBeVisible()

  await page.getByTestId("reset-pursuit-button").click()

  await expect(page.getByTestId("opportunity-name-input")).toHaveValue("")
  await expect(
    page.getByRole("button", { name: "Generate Recommendation" }),
  ).toBeVisible()
  await expect(page.getByTestId("recommendation-badge")).toHaveCount(0)
})
