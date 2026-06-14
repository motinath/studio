"""
QChipLang Parser
Builds an AST from the token stream produced by the Lexer.
"""

from typing import Any, Dict, List, Optional, Tuple
from .lexer import Token, TT, Lexer
from .ast_nodes import *


class ParseError(Exception):
    def __init__(self, msg, tok: Token):
        super().__init__(f"[L{tok.line}:{tok.col}] ParseError: {msg} (got {tok.type.name} {tok.value!r})")
        self.tok = tok


class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    # ── Primitives ────────────────────────────────────────────────────────────

    def peek(self, offset=0) -> Token:
        i = self.pos + offset
        return self.tokens[min(i, len(self.tokens) - 1)]

    def advance(self) -> Token:
        tok = self.tokens[self.pos]
        if tok.type != TT.EOF:
            self.pos += 1
        return tok

    def expect(self, tt: TT) -> Token:
        tok = self.advance()
        if tok.type != tt:
            raise ParseError(f"Expected {tt.name}", tok)
        return tok

    def match(self, *types: TT) -> Optional[Token]:
        if self.peek().type in types:
            return self.advance()
        return None

    def check(self, *types: TT) -> bool:
        return self.peek().type in types

    # ── Value Parsing ─────────────────────────────────────────────────────────

    def parse_value(self) -> Any:
        """Parse a single value: number+unit, string, ident, bool, auto, tuple,
        array, sweep(), from_file(), or range."""
        tok = self.peek()

        if tok.type == TT.NUMBER:
            self.advance()
            num = float(tok.value)
            if self.peek().type == TT.UNIT:
                unit = self.advance().value
                return QValue(num, unit)
            return QValue(num, None)

        if tok.type == TT.STRING:
            self.advance()
            return tok.value

        if tok.type == TT.TRUE:
            self.advance()
            return True

        if tok.type == TT.FALSE:
            self.advance()
            return False

        if tok.type == TT.AUTO:
            self.advance()
            return 'auto'

        if tok.type == TT.DASH:
            # Negative number: -200MHz
            self.advance()
            num_tok = self.peek()
            if num_tok.type != TT.NUMBER:
                raise ParseError("Expected number after '-'", num_tok)
            self.advance()
            num = -float(num_tok.value)
            if self.peek().type == TT.UNIT:
                unit = self.advance().value
                return QValue(num, unit)
            return QValue(num, None)

        if tok.type == TT.SWEEP:
            return self.parse_sweep()

        if tok.type == TT.FROM_FILE:
            return self.parse_from_file()

        if tok.type == TT.LBRACKET:
            return self.parse_array()

        if tok.type == TT.LPAREN:
            return self.parse_tuple()

        # Any identifier-like token (including keywords used as references)
        if tok.type == TT.IDENT or tok.type not in (
            TT.LBRACE, TT.RBRACE, TT.LBRACKET, TT.RBRACKET,
            TT.LPAREN, TT.RPAREN, TT.COLON, TT.COMMA, TT.EOF, TT.CONNECT_OP,
        ):
            self.advance()
            name = tok.value
            if self.peek().type == TT.LBRACKET:
                self.advance()
                inner = self.parse_subscript_inner()
                self.expect(TT.RBRACKET)
                return {'ref': name, 'subscript': inner}
            return name

        raise ParseError("Expected a value", tok)

    def parse_sweep(self) -> QSweep:
        self.expect(TT.SWEEP)
        self.expect(TT.LPAREN)
        start = self.parse_value()
        self.expect(TT.COMMA)
        end = self.parse_value()
        self.expect(TT.COMMA)
        mode = self.expect(TT.IDENT).value
        self.expect(TT.RPAREN)
        return QSweep(start, end, mode)

    def parse_from_file(self) -> QFromFile:
        self.expect(TT.FROM_FILE)
        self.expect(TT.LPAREN)
        path = self.expect(TT.STRING).value
        self.expect(TT.RPAREN)
        return QFromFile(path)

    def parse_array(self) -> QArray:
        self.expect(TT.LBRACKET)
        items = []
        while not self.check(TT.RBRACKET, TT.EOF):
            items.append(self.parse_value())
            if not self.match(TT.COMMA):
                break
        self.expect(TT.RBRACKET)
        return QArray(items)

    def parse_tuple(self) -> QTuple:
        self.expect(TT.LPAREN)
        items = []
        while not self.check(TT.RPAREN, TT.EOF):
            items.append(self.parse_value())
            if not self.match(TT.COMMA):
                break
        self.expect(TT.RPAREN)
        return QTuple(items)

    def parse_subscript_inner(self) -> Any:
        """Inside [...] — could be range 0:49999, or key=value filter row=0."""
        tok = self.peek()
        if tok.type == TT.NUMBER:
            start = int(self.advance().value)
            if self.peek().type == TT.COLON:
                self.advance()
                end = int(self.expect(TT.NUMBER).value)
                return QRange(start, end)
            return start
        if tok.type == TT.IDENT:
            key = self.advance().value
            self.expect(TT.EQ)
            val = self.parse_value()
            return {'filter': key, 'value': val}
        raise ParseError("Expected range or filter in []", tok)

    # ── Attribute Block ────────────────────────────────────────────────────────

    def parse_attr_block(self) -> Dict[str, Any]:
        """Parse { key: value ... } dict."""
        self.expect(TT.LBRACE)
        attrs: Dict[str, Any] = {}
        while not self.check(TT.RBRACE, TT.EOF):
            # Check for nested block (e.g. substrate in process_stack)
            key_tok = self.peek()
            if key_tok.type in (TT.IDENT, TT.LAYER) or key_tok.type.name.lower() in KEYWORDS_AS_IDENT:
                key = self.advance().value
            else:
                key = self.advance().value  # consume whatever keyword as string key

            # substrate: sapphire { ... } — nested block with optional extra label
            if self.peek().type == TT.IDENT and self.peek(1).type == TT.LBRACE:
                label = self.advance().value
                nested = self.parse_attr_block()
                attrs[key] = {'label': label, **nested}
            elif self.check(TT.LBRACE):
                attrs[key] = self.parse_attr_block()
            else:
                self.expect(TT.COLON)
                attrs[key] = self.parse_value()

        self.expect(TT.RBRACE)
        return attrs

    # ── Top-Level Declarations ─────────────────────────────────────────────────

    def parse_chip(self) -> ChipDecl:
        self.expect(TT.CHIP)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return ChipDecl(name, attrs)

    def parse_qubit(self) -> QubitDecl:
        self.expect(TT.QUBIT)
        dims = None
        index_range = None

        # qubit[8][8] or qubit[0:7]
        if self.check(TT.LBRACKET):
            self.advance()
            inner = self.parse_subscript_inner()
            self.expect(TT.RBRACKET)
            if isinstance(inner, int):
                dims = [inner]
                if self.check(TT.LBRACKET):
                    self.advance()
                    d2 = int(self.expect(TT.NUMBER).value)
                    self.expect(TT.RBRACKET)
                    dims.append(d2)
            elif isinstance(inner, QRange):
                index_range = inner

        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return QubitDecl(name, dims, index_range, attrs)

    def parse_resonator(self) -> ResonatorDecl:
        self.expect(TT.RESONATOR)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return ResonatorDecl(name, attrs)

    def parse_coupler(self) -> CouplerDecl:
        self.expect(TT.COUPLER)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return CouplerDecl(name, attrs)

    def parse_connect(self) -> ConnectStmt:
        self.expect(TT.CONNECT)
        left = self.expect(TT.IDENT).value
        self.expect(TT.CONNECT_OP)
        right = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return ConnectStmt(left, right, attrs)

    def parse_topology(self) -> TopologyDecl:
        self.expect(TT.TOPOLOGY)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return TopologyDecl(name, attrs)

    def parse_tile(self) -> TileDecl:
        self.expect(TT.TILE)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return TileDecl(name, attrs)

    def parse_tile_array(self) -> TileArrayDecl:
        self.expect(TT.TILE_ARRAY)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return TileArrayDecl(name, attrs)

    def parse_feedline(self) -> FeedlineDecl:
        self.expect(TT.FEEDLINE)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return FeedlineDecl(name, attrs)

    def parse_flux_line(self) -> FluxLineDecl:
        self.expect(TT.FLUX_LINE)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return FluxLineDecl(name, attrs)

    def parse_drive_line(self) -> DriveLineDecl:
        self.expect(TT.DRIVE_LINE)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return DriveLineDecl(name, attrs)

    def parse_package(self) -> PackageDecl:
        self.expect(TT.PACKAGE)
        attrs = self.parse_attr_block()
        return PackageDecl(attrs)

    def parse_io_port(self) -> IOPortDecl:
        self.expect(TT.IO_PORT)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return IOPortDecl(name, attrs)

    def parse_process_stack(self) -> ProcessStackDecl:
        self.expect(TT.PROCESS_STACK)
        self.expect(TT.LBRACE)
        substrate = {}
        layers = []
        while not self.check(TT.RBRACE, TT.EOF):
            tok = self.peek()
            if tok.type == TT.IDENT and tok.value == 'substrate':
                self.advance()  # consume 'substrate'
                self.expect(TT.COLON)
                # substrate: sapphire { ... }
                label = self.advance().value  # material name
                sub_attrs = self.parse_attr_block()
                substrate = {'material': label, **sub_attrs}
            elif tok.type == TT.LAYER:
                self.advance()
                lname = self.advance().value
                lattrs = self.parse_attr_block()
                layers.append(LayerDecl(lname, lattrs))
            else:
                self.advance()
        self.expect(TT.RBRACE)
        return ProcessStackDecl(substrate, layers)

    def parse_design_rules(self) -> DesignRulesDecl:
        self.expect(TT.DESIGN_RULES)
        attrs = self.parse_attr_block()
        return DesignRulesDecl(attrs)

    def parse_application(self) -> ApplicationDecl:
        self.expect(TT.APPLICATION)
        name = self.expect(TT.IDENT).value
        attrs = self.parse_attr_block()
        return ApplicationDecl(name, attrs)

    def parse_simulate(self) -> SimulateDecl:
        self.expect(TT.SIMULATE)
        attrs = self.parse_attr_block()
        return SimulateDecl(attrs)

    # ── Program ────────────────────────────────────────────────────────────────

    def parse(self) -> Program:
        prog = Program()
        DISPATCH = {
            TT.CHIP:          lambda: setattr(prog, 'chip', self.parse_chip()),
            TT.QUBIT:         lambda: prog.qubits.append(self.parse_qubit()),
            TT.RESONATOR:     lambda: prog.resonators.append(self.parse_resonator()),
            TT.COUPLER:       lambda: prog.couplers.append(self.parse_coupler()),
            TT.CONNECT:       lambda: prog.connections.append(self.parse_connect()),
            TT.TOPOLOGY:      lambda: prog.topologies.append(self.parse_topology()),
            TT.TILE:          lambda: prog.tiles.append(self.parse_tile()),
            TT.TILE_ARRAY:    lambda: prog.tile_arrays.append(self.parse_tile_array()),
            TT.FEEDLINE:      lambda: prog.feedlines.append(self.parse_feedline()),
            TT.FLUX_LINE:     lambda: prog.flux_lines.append(self.parse_flux_line()),
            TT.DRIVE_LINE:    lambda: prog.drive_lines.append(self.parse_drive_line()),
            TT.PACKAGE:       lambda: setattr(prog, 'package', self.parse_package()),
            TT.IO_PORT:       lambda: prog.io_ports.append(self.parse_io_port()),
            TT.PROCESS_STACK: lambda: setattr(prog, 'process_stack', self.parse_process_stack()),
            TT.DESIGN_RULES:  lambda: setattr(prog, 'design_rules', self.parse_design_rules()),
            TT.APPLICATION:   lambda: prog.applications.append(self.parse_application()),
            TT.SIMULATE:      lambda: setattr(prog, 'simulate', self.parse_simulate()),
        }
        while not self.check(TT.EOF):
            tok = self.peek()
            if tok.type in DISPATCH:
                DISPATCH[tok.type]()
            else:
                raise ParseError("Unexpected token at top level", tok)
        return prog


# Allow keyword tokens to be used as attribute keys
KEYWORDS_AS_IDENT = {tt.name.lower() for tt in TT}


def parse_qcl(source: str) -> Program:
    """Convenience: lex + parse a .qcl source string."""
    lexer = Lexer(source)
    tokens = lexer.tokenize()
    parser = Parser(tokens)
    return parser.parse()
