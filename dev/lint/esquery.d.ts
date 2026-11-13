declare module 'esquery' {
  export type Node = {
    type: string;
    start: number;
    end: number;
    name?: string;
    value?: string;
    callee?: Node;
    object?: Node;
    property?: Node;
    source?: Node;
    moduleReference?: Node;
    expression?: Node;
    computed?: boolean;
    importKind?: string;
    exportKind?: string;
    imported?: Node;
    local?: Node;
    specifiers?: Node[];
    params?: Node[];
    arguments?: Node[];
    expressions?: Node[];
    quasis?: { value: { cooked?: string; raw: string } }[];
    raw?: string;
  };
  type Selector = object;
  const query: {
    parse(selector: string): Selector;
    match(ast: Node, selector: Selector, options: { fallback: 'iteration' }): Node[];
    matches(node: Node, selector: Selector): boolean;
  };
  export default query;
}
