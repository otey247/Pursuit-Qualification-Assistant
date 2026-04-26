from app.api.routes.pursuit import _build_recommendation, assess_pursuit
from app.models import PursuitAssessment


def _make_assessment(**overrides: int) -> PursuitAssessment:
    defaults = {
        "opportunity_name": "Test Opportunity",
        "relationship_strength": 3,
        "fit": 3,
        "timing": 3,
        "budget_realism": 3,
        "competitive_position": 3,
        "delivery_risk": 3,
        "differentiators": 3,
    }
    defaults.update(overrides)
    return PursuitAssessment(**defaults)


def test_pursue_recommendation() -> None:
    assessment = _make_assessment(
        relationship_strength=5,
        fit=5,
        timing=4,
        budget_realism=4,
        competitive_position=4,
        delivery_risk=4,
        differentiators=5,
    )
    result = assess_pursuit(assessment)
    assert result.recommendation == "Pursue"
    assert result.overall_score >= 3.5
    assert "pursue" in result.summary.lower() or "Pursue" in result.summary


def test_shape_recommendation() -> None:
    assessment = _make_assessment()  # all 3s → average 3.0
    result = assess_pursuit(assessment)
    assert result.recommendation == "Shape"
    assert 2.5 <= result.overall_score < 3.5


def test_walk_away_recommendation() -> None:
    assessment = _make_assessment(
        relationship_strength=1,
        fit=2,
        timing=1,
        budget_realism=2,
        competitive_position=1,
        delivery_risk=2,
        differentiators=1,
    )
    result = assess_pursuit(assessment)
    assert result.recommendation == "Walk Away"
    assert result.overall_score < 2.5


def test_result_has_seven_dimensions() -> None:
    assessment = _make_assessment()
    result = assess_pursuit(assessment)
    assert len(result.dimensions) == 7


def test_result_has_actions() -> None:
    assessment = _make_assessment()
    result = assess_pursuit(assessment)
    assert len(result.actions) > 0


def test_overall_score_matches_average() -> None:
    assessment = _make_assessment(
        relationship_strength=2,
        fit=4,
        timing=3,
        budget_realism=5,
        competitive_position=1,
        delivery_risk=3,
        differentiators=2,
    )
    result = assess_pursuit(assessment)
    expected = (2 + 4 + 3 + 5 + 1 + 3 + 2) / 7
    assert abs(result.overall_score - round(expected, 2)) < 0.01


def test_build_recommendation_boundaries() -> None:
    # Exact boundary at 3.5 → Pursue
    rec, _, _ = _build_recommendation(3.5, "Test")
    assert rec == "Pursue"

    # Just below 3.5 → Shape
    rec, _, _ = _build_recommendation(3.49, "Test")
    assert rec == "Shape"

    # Exact boundary at 2.5 → Shape
    rec, _, _ = _build_recommendation(2.5, "Test")
    assert rec == "Shape"

    # Just below 2.5 → Walk Away
    rec, _, _ = _build_recommendation(2.49, "Test")
    assert rec == "Walk Away"
