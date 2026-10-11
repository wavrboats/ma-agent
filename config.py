from dataclasses import dataclass, field
from typing import List

@dataclass
class DealCriteria:
    min_revenue: float = 1_000_000.0
    min_ebitda_margin: float = 0.10
    max_customer_concentration: float = 0.30
    max_integration_complexity: int = 7
    preferred_industries: List[str] = field(default_factory=lambda: ["software", "saas", "services"])
