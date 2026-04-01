from config import BLOCK_THRESHOLD, REWRITE_THRESHOLD
from models import ClassificationResult


def apply_decision(result: ClassificationResult) -> ClassificationResult:
    """
    Override the classifier's self-reported verdict with threshold-based rules.
    The classifier's verdict is advisory; the thresholds are authoritative.
    """
    score = result.risk_score

    if score >= BLOCK_THRESHOLD:
        enforced_verdict = "BLOCK"
    elif score >= REWRITE_THRESHOLD:
        enforced_verdict = "REWRITE"
    else:
        enforced_verdict = "ALLOW"

    # Never downgrade a BLOCK to REWRITE/ALLOW if classifier said BLOCK
    # (classifier may flag a prompt as BLOCK even with a score just below threshold)
    if result.verdict == "BLOCK" and enforced_verdict != "BLOCK":
        enforced_verdict = "BLOCK"

    return result.model_copy(update={"verdict": enforced_verdict})
