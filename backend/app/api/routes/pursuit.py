from typing import Literal, TypedDict

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.models import (
    PursuitAssessment,
    PursuitDimensionScore,
    PursuitRecommendation,
)

router = APIRouter(prefix="/pursuit", tags=["pursuit"])

_NUM_DIMENSIONS = 7

PursuitDimensionField = Literal[
    "relationship_strength",
    "fit",
    "timing",
    "budget_realism",
    "competitive_position",
    "delivery_risk",
    "differentiators",
]
PursuitRecommendationLabel = Literal["Pursue", "Shape", "Walk Away"]


class DimensionMeta(TypedDict):
    field: PursuitDimensionField
    label: str
    rationale_map: dict[int, str]


_DIMENSION_META: list[DimensionMeta] = [
    {
        "field": "relationship_strength",
        "label": "Relationship Strength",
        "rationale_map": {
            1: "No meaningful relationship exists; starting from scratch.",
            2: "Minimal contact; limited insight into the client's priorities.",
            3: "Some relationship established; moderate access to decision-makers.",
            4: "Strong relationship with key stakeholders and good positioning.",
            5: "Trusted advisor status; strong advocate inside the account.",
        },
    },
    {
        "field": "fit",
        "label": "Opportunity Fit",
        "rationale_map": {
            1: "Poor fit; significant capability or domain gaps.",
            2: "Weak fit; notable gaps that would require heavy partnering or stretching.",
            3: "Moderate fit; we can deliver but this is not a core strength.",
            4: "Good fit; aligns well with our proven capabilities.",
            5: "Excellent fit; squarely in our sweet spot with strong references.",
        },
    },
    {
        "field": "timing",
        "label": "Timing",
        "rationale_map": {
            1: "Very poor timing; we are not positioned for this cycle.",
            2: "Challenging timing; limited runway to influence the outcome.",
            3: "Adequate timing; we can participate but are not ahead.",
            4: "Good timing; enough time to shape requirements and build rapport.",
            5: "Ideal timing; early enough to influence the opportunity significantly.",
        },
    },
    {
        "field": "budget_realism",
        "label": "Budget Realism",
        "rationale_map": {
            1: "Severely underfunded; budget is not aligned with the stated scope.",
            2: "Budget is tight; significant risk of scope cuts or repricing.",
            3: "Budget is workable but constrained; careful management required.",
            4: "Budget is reasonable and aligned with market rates.",
            5: "Budget is well-funded and realistic for the full scope.",
        },
    },
    {
        "field": "competitive_position",
        "label": "Competitive Position",
        "rationale_map": {
            1: "Major competitive disadvantage; incumbent or preferred competitor exists.",
            2: "Weaker position; competitors have clear advantages.",
            3: "Neutral position; competitive landscape is even.",
            4: "Strong position; differentiated versus most competitors.",
            5: "Clear frontrunner; we are the preferred or incumbent provider.",
        },
    },
    {
        "field": "delivery_risk",
        "label": "Delivery Risk",
        "rationale_map": {
            1: "Very high delivery risk; significant unmitigated execution challenges.",
            2: "High risk; multiple delivery concerns without clear mitigation.",
            3: "Moderate risk; manageable with proper planning and staffing.",
            4: "Low-moderate risk; we have done this before with good outcomes.",
            5: "Low risk; strong delivery track record for this type of work.",
        },
    },
    {
        "field": "differentiators",
        "label": "Differentiators",
        "rationale_map": {
            1: "No meaningful differentiators; we look the same as competitors.",
            2: "Weak differentiators; marginal advantages that are easily matched.",
            3: "Some differentiators; a few distinguishing factors but not compelling.",
            4: "Strong differentiators; clear and relevant advantages.",
            5: "Unique and compelling differentiators; hard for competitors to replicate.",
        },
    },
]

assert len(_DIMENSION_META) == _NUM_DIMENSIONS, (
    f"_DIMENSION_META has {len(_DIMENSION_META)} entries but _NUM_DIMENSIONS is {_NUM_DIMENSIONS}; "
    "keep them in sync."
)


def _build_recommendation(
    score: float, name: str
) -> tuple[PursuitRecommendationLabel, str, list[str]]:
    """Return (recommendation_label, summary, actions) based on overall score."""
    recommendation: PursuitRecommendationLabel
    if score >= 3.5:
        recommendation = "Pursue"
        summary = (
            f"'{name}' is a strong opportunity. The overall qualification score of "
            f"{score:.1f}/5.0 indicates a favourable outlook across the key dimensions. "
            "Commit pursuit resources, assign a capture lead, and develop a win strategy."
        )
        actions = [
            "Assign a dedicated capture manager and pursuit team.",
            "Develop a detailed win strategy and competitive positioning plan.",
            "Schedule executive engagement to deepen relationship strength.",
            "Prepare a compelling proposal that highlights your differentiators.",
            "Set up internal gate reviews at key milestones.",
        ]
    elif score >= 2.5:
        recommendation = "Shape"
        summary = (
            f"'{name}' has potential but requires active shaping before fully committing. "
            f"The overall qualification score of {score:.1f}/5.0 reveals areas that need "
            "improvement. Address the weaker dimensions before investing full pursuit resources."
        )
        actions = [
            "Identify and engage sponsors who can champion your solution internally.",
            "Work to influence requirements to better align with your capabilities.",
            "Assess partnership options to shore up capability or relationship gaps.",
            "Develop a mitigation plan for the highest-risk dimensions.",
            "Set a re-qualification checkpoint before the next major pursuit milestone.",
        ]
    else:
        recommendation = "Walk Away"
        summary = (
            f"'{name}' does not meet the qualification threshold. The overall score of "
            f"{score:.1f}/5.0 indicates too many significant gaps to justify a full pursuit "
            "investment at this time. Consider walking away or revisiting when conditions improve."
        )
        actions = [
            "Document the gaps and reasons for not pursuing.",
            "Communicate the no-bid decision to all stakeholders promptly.",
            "Identify what would need to change to make this opportunity viable in the future.",
            "Redirect pursuit resources to higher-scoring opportunities.",
            "Keep a watching brief in case the opportunity is re-scoped or re-bid.",
        ]
    return recommendation, summary, actions


@router.post("/assess", response_model=PursuitRecommendation)
def assess_pursuit(
    assessment: PursuitAssessment, _current_user: CurrentUser
) -> PursuitRecommendation:
    """
    Assess an opportunity and return a pursue / shape / walk-away recommendation.
    """
    field_values: dict[PursuitDimensionField, int] = {
        "relationship_strength": assessment.relationship_strength,
        "fit": assessment.fit,
        "timing": assessment.timing,
        "budget_realism": assessment.budget_realism,
        "competitive_position": assessment.competitive_position,
        "delivery_risk": assessment.delivery_risk,
        "differentiators": assessment.differentiators,
    }

    dimensions: list[PursuitDimensionScore] = []
    total = 0

    for meta in _DIMENSION_META:
        field = meta["field"]
        score = field_values[field]
        total += score
        dimensions.append(
            PursuitDimensionScore(
                label=meta["label"],
                score=score,
                max_score=5,
                rationale=meta["rationale_map"][score],
            )
        )

    overall_score = total / _NUM_DIMENSIONS
    recommendation, summary, actions = _build_recommendation(
        overall_score, assessment.opportunity_name
    )

    return PursuitRecommendation(
        opportunity_name=assessment.opportunity_name,
        recommendation=recommendation,
        overall_score=round(overall_score, 2),
        summary=summary,
        dimensions=dimensions,
        actions=actions,
    )
