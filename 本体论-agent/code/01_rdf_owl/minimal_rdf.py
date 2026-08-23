"""最小 RDF 示例：创建企业知识助手的三元组并查询关系。"""

from rdflib import Graph, Literal, Namespace, RDF, RDFS


EX = Namespace("http://example.com/enterprise#")


def build_graph() -> Graph:
    graph = Graph()
    graph.bind("ex", EX)

    graph.add((EX.Product, RDF.type, RDFS.Class))
    graph.add((EX.Module, RDF.type, RDFS.Class))
    graph.add((EX.belongsTo, RDF.type, RDF.Property))
    graph.add((EX.belongsTo, RDFS.domain, EX.Product))
    graph.add((EX.belongsTo, RDFS.range, EX.Module))

    graph.add((EX.product_a, RDF.type, EX.Product))
    graph.add((EX.product_a, EX.name, Literal("产品 A")))
    graph.add((EX.module_b, RDF.type, EX.Module))
    graph.add((EX.module_b, EX.name, Literal("模块 B")))
    graph.add((EX.product_a, EX.belongsTo, EX.module_b))
    return graph


def main() -> None:
    graph = build_graph()
    query = """
    PREFIX ex: <http://example.com/enterprise#>
    SELECT ?product_name ?module_name
    WHERE {
        ex:product_a ex:name ?product_name .
        ex:product_a ex:belongsTo ?module .
        ?module ex:name ?module_name .
    }
    """
    for row in graph.query(query):
        print(f"{row.product_name} 属于 {row.module_name}")


if __name__ == "__main__":
    main()
