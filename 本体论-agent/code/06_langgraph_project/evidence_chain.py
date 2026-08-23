# """构造最小可解释回答和证据链。"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    kind: str
    content: str
    source_id: str


@dataclass(frozen=True)
class Claim:
    claim_id: str
    text: str
    evidence_ids: list[str]


def build_answer(evidence: list[Evidence]) -> dict[str, object]:
    claims = [
        Claim("claim-001", "登录失败影响登录功能", ["kg:issue-feature"]),
        Claim("claim-002", "推荐检查身份服务配置", ["doc:login-guide#4"]),
    ]
    return {
        "answer": "产品 A 的登录失败优先检查身份服务配置。",
        "claims": [claim.__dict__ for claim in claims],
        "evidence": [item.__dict__ for item in evidence],
        "uncertainty": "未执行自动修复；高风险配置变更需要审核。",
    }


def main() -> None:
    evidence = [
        Evidence("kg:issue-feature", "graph_fact", "issue_d affects feature_c", "kg"),
        Evidence("doc:login-guide#4", "document_chunk", "登录失败时检查身份服务配置", "login-guide"),
    ]
    answer = build_answer(evidence)
    print(answer["answer"])
    print(answer["uncertainty"])


if __name__ == "__main__":
    main()

