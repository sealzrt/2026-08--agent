"""最小 RDFS 推理示例。需要 rdflib 和 owlrl。"""

from rdflib import Graph, Namespace, RDF, RDFS
from owlrl import DeductiveClosure, RDFS_Semantics


EX = Namespace("http://example.com/enterprise#")


def main() -> None:
    graph = Graph()
    graph.bind("ex", EX)

    graph.add((EX.BusinessObject, RDF.type, RDFS.Class))
    graph.add((EX.Product, RDF.type, RDFS.Class))
    graph.add((EX.Product, RDFS.subClassOf, EX.BusinessObject))
    graph.add((EX.product_a, RDF.type, EX.Product))

    DeductiveClosure(RDFS_Semantics).expand(graph)

    if (EX.product_a, RDF.type, EX.BusinessObject) in graph:
        print("推理结果：product_a 也是 BusinessObject")


if __name__ == "__main__":
    main()
