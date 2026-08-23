"""读取 enterprise.ttl，并执行一条多跳 SPARQL 查询。"""

from pathlib import Path

from rdflib import Graph


BASE_DIR = Path(__file__).resolve().parents[1]
TTL_PATH = BASE_DIR / "03_ontology_modeling" / "enterprise.ttl"


def main() -> None:
    graph = Graph()
    graph.parse(TTL_PATH, format="turtle")

    query = """
    PREFIX ex: <http://example.com/enterprise#>
    SELECT ?product_name ?issue_name ?solution_name
    WHERE {
        ?product ex:name ?product_name .
        ?product ex:belongsTo ?module .
        ?module ex:contains ?feature .
        ?issue ex:affects ?feature .
        ?issue ex:name ?issue_name .
        ?issue ex:resolvedBy ?solution .
        ?solution ex:name ?solution_name .
    }
    """

    for row in graph.query(query):
        print(f"{row.product_name}: {row.issue_name} -> {row.solution_name}")


if __name__ == "__main__":
    main()
