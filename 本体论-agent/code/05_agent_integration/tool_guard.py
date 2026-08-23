"""工具调用前的领域类型、前置条件和风险校验。仅使用标准库。"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ToolSpec:
    tool_id: str
    required_types: dict[str, str]
    required_roles: set[str]
    risk_level: str
    requires_approval: bool


def validate_call(
    spec: ToolSpec,
    arguments: dict[str, Any],
    entity_types: dict[str, str],
    roles: set[str],
    approved: bool = False,
) -> tuple[str, list[str]]:
    errors: list[str] = []
    for field, expected_type in spec.required_types.items():
        value = arguments.get(field)
        if not value:
            errors.append(f"missing:{field}")
            continue
        if entity_types.get(value) != expected_type:
            errors.append(f"type:{field}:{expected_type}")
    if spec.required_roles and not spec.required_roles.intersection(roles):
        errors.append("role_missing")
    if errors:
        return "invalid", errors
    if spec.requires_approval and not approved:
        return "requires_approval", []
    return "allowed", []


def main() -> None:
    spec = ToolSpec(
        tool_id="diagnose_login",
        required_types={"product_id": "Product", "issue_id": "Issue"},
        required_roles={"support_engineer"},
        risk_level="medium",
        requires_approval=False,
    )
    decision, reasons = validate_call(
        spec,
        {"product_id": "product_a", "issue_id": "issue_d"},
        {"product_a": "Product", "issue_d": "Issue"},
        {"support_engineer"},
    )
    print(decision, reasons)


if __name__ == "__main__":
    main()
