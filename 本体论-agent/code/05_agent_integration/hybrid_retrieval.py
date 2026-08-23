"""合并三类检索证据，演示本体增强 RAG 的最小排序逻辑。"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Evidence:
    kind: str
    content: str
    source_id: str
    score: float
    visible: bool = True


KIND_WEIGHT = {
    "graph_fact": 1.00,
    "keyword": 0.85,
    "document_chunk": 0.75,
    "vector": 0.70,
}


def merge_evidence(items: list[Evidence], limit: int = 5) -> list[Evidence]:
    """先过滤不可见证据，再按来源类型权重和召回分排序去重。"""
    visible = [item for item in items if item.visible]
    ranked = sorted(
        visible,
        key=lambda item: (KIND_WEIGHT.get(item.kind, 0.5) * item.score),
        reverse=True,
    )
    result: list[Evidence] = []
    seen_sources: set[str] = set()
    for item in ranked:
        if item.source_id in seen_sources:
            continue
        result.append(item)
        seen_sources.add(item.source_id)
        if len(result) >= limit:
            break
    return result


def main() -> None:
    evidence = [
        Evidence("graph_fact", "产品 A 属于模块 B", "kg:fact-001", 1.0),
        Evidence("document_chunk", "登录失败时检查身份服务配置", "doc:login#4", 0.91),
        Evidence("vector", "相似问题的处理建议", "doc:login#4", 0.96),
        Evidence("document_chunk", "内部受限文档片段", "doc:internal#2", 0.99, visible=False),
    ]
    for item in merge_evidence(evidence):
        print(f"[{item.kind}] {item.source_id}: {item.content}")


if __name__ == "__main__":
    main()

