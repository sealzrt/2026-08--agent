"""按本体类型和关系筛选 Agent 上下文。仅使用标准库。"""

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class SemanticFact:
    subject: str
    subject_type: str
    predicate: str
    object: str
    object_type: str
    status: str = "confirmed"


ALLOWED_RELATIONS = {
    "Product": {"belongsTo", "hasCurrentIssue"},
    "Module": {"contains"},
    "Issue": {"affects", "resolvedBy"},
}


def select_context(
    facts: Iterable[SemanticFact],
    entity_ids: set[str],
    allowed_types: set[str],
) -> list[SemanticFact]:
    """只保留与当前实体相关、类型合法且已确认的事实。"""
    selected: list[SemanticFact] = []
    for fact in facts:
        if fact.status != "confirmed":
            continue
        if fact.subject not in entity_ids and fact.object not in entity_ids:
            continue
        if fact.subject_type not in allowed_types or fact.object_type not in allowed_types:
            continue
        if fact.predicate not in ALLOWED_RELATIONS.get(fact.subject_type, set()):
            continue
        selected.append(fact)
    return selected


def main() -> None:
    facts = [
        SemanticFact("product_a", "Product", "belongsTo", "module_b", "Module"),
        SemanticFact("module_b", "Module", "contains", "feature_c", "Feature"),
        SemanticFact("product_a", "Product", "hasCurrentIssue", "issue_d", "Issue"),
        SemanticFact("user_pref", "Preference", "prefers", "verbose", "Value"),
    ]
    context = select_context(facts, {"product_a", "module_b"}, {"Product", "Module", "Feature", "Issue"})
    for fact in context:
        print(f"{fact.subject} -[{fact.predicate}]-> {fact.object}")


if __name__ == "__main__":
    main()

