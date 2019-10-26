%lex
%%

[ ]+                                                  return "SPACE"
"$$"                                                  return "DOUBLE_DOLLAR_SIGN"

"$"                                                   return "DOLLAR_SIGN"
"("                                                   return "OPEN_PAREN"
")"                                                   return "CLOSE_PAREN"
"{"                                                   return "OPEN_BRACE"
"}"                                                   return "CLOSE_BRACE"
","                                                   return "COMMA"

\"([^"]|\\.)*\"                                       return "STRING"

(0x([0-9A-Fa-f][0-9A-Fa-f])*)                         return "HEX"
(\-?[0-9]+)                                           return "NUMBER"
(true|false)                                          return "BOOLEAN"

[A-Za-z_][A-Za-z0-9_]*                                return "ID"
([`~!@#$%^&*()<.>/?;:'"+=_-]|\]|\[|\\\\)              return "SYMBOL"
\\u\{[1-9A-Fa-f][0-9A-Fa-f]*\}                        return "ESCAPED"
\\m\{[A-Za-z0-9_=:./?-]*\}                            return "METADATA"

<<EOF>>                                               return "EOF"

/lex

%start program

%%

program
    : format_string EOF
        {
            return $1.filter((node) => {
                // Remove empty text nodes
                return !(node.type === "text" && node.value === "");
            });
        }
    ;

format_string
    : text
        { $$ = [ $1 ]; }
    | text substitution format_string
        { {
            const nodes = $3.slice();
            nodes.unshift($2);
            nodes.unshift($1);
            $$ = nodes;
        } }
    ;

symbol
    : SYMBOL
    | OPEN_PAREN
    | CLOSE_PAREN
    | OPEN_BRACE
    | CLOSE_BRACE
    | COMMA
    | HEX
    | NUMBER
    | BOOLEAN
    ;

text
    : 
        { $$ = { type: "text", value: "", metadata: [ ] }; }
    | ID text
        { {
            $$ = { type: "text", value: ($1 + $2.value), metadata: $2.metadata };
        } }
    | SPACE text
        { {
            $$ = { type: "text", value: ($1 + $2.value), metadata: $2.metadata };
        } }
    | symbol text
        { {
            $$ = { type: "text", value: ((($1 === "\\\\") ? "\\": $1) + $2.value), metadata: $2.metadata };
        } }
    | DOUBLE_DOLLAR_SIGN text
        { {
            $$ = { type: "text", value: ("$" + $2.value), metadata: $2.metadata };
        } }
    | ESCAPED text
        { {
            const codePoint = parseInt($1.substring(3, $1.length - 1), 16);
            // @TODO: Verify code point is printable and not a surrogate
            $$ = { type: "text", value: (String.fromCodePoint(codePoint) + $2.value), metadata: $2.metadata };
        } }
    | METADATA text
        { {
            const metadata = $2.metadata.slice();
            metadata.unshift($1.substring(3, $1.length - 1));
            $$ = { type: "text", value: $2.value, metadata: metadata };
        } }
    ;

substitution
    : DOLLAR_SIGN OPEN_BRACE expression_list CLOSE_BRACE
        { $$ = { type: "substitution", value: $3 }; }
    ;

base_expression
    : ID OPEN_PAREN expression_list CLOSE_PAREN
        { $$ = { type: "function", name: $1, params: $3 }; }
    | ID OPEN_PAREN CLOSE_PAREN
        { $$ = { type: "function", name: $1, params: [ ] }; }
    | STRING
        { $$ = { type: "string", value: $1.substring(1, $1.length - 1) }; }
    | NUMBER
        { $$ = { type: "number", value: $1 }; }
    | HEX
        { $$ = { type: "bytes", value: $1 };}
    | BOOLEAN
        { $$ = { type: "boolean", value: ($1 === "true") }; }
    ;

whitespace
    : 
    | SPACE
    ;

expression
    : whitespace base_expression whitespace
        { $$ = $2; }
    ;

expression_list
    : expression
        { $$ = [ $1 ]; }
    | expression COMMA expression_list
       { {
            const nodes = $3.slice();
            nodes.unshift($1);
            $$ = nodes;
       } }
    ;

%%

//const ethers = require("ethers");

module.exports.foo = function() { return 3; }
