"""
QCLang Parser — converts token stream → AST.
"""

from __future__ import annotations

from app.qclang.ast_nodes import (
    Attribute,
    ChipNode,
    CouplerNode,
    Program,
    QubitNode,
    ReadoutNode,
    ResonatorNode,
    VariableNode,
)
from app.qclang.lexer import TT, Token, tokenise


class ParseError(Exception):
    def __init__(self, message: str, line: int = 0, col: int = 0):
        super().__init__(f"[Parser] line {line}:{col} — {message}")
        self.line = line
        self.col = col


class Parser:
    def __init__(self, tokens: list[Token]):
        self._tokens = tokens
        self._pos = 0

    # ── helpers ──────────────────────────────────────────────────────────

    @property
    def _current(self) -> Token:
        return self._tokens[self._pos]

    def _peek(self, offset: int = 1) -> Token:
        idx = self._pos + offset
        if idx < len(self._tokens):
            return self._tokens[idx]
        return self._tokens[-1]  # EOF

    def _advance(self) -> Token:
        tok = self._current
        if self._pos < len(self._tokens) - 1:
            self._pos += 1
        return tok

    def _expect(self, tt: TT) -> Token:
        if self._current.type != tt:
            raise ParseError(
                f"Expected {tt.name}, got {self._current.type.name} ({self._current.value!r})",
                self._current.line,
                self._current.col,
            )
        return self._advance()

    def _skip_newlines(self) -> None:
        while self._current.type == TT.NEWLINE:
            self._advance()

    # ── parse attribute value ─────────────────────────────────────────────

    def _parse_attr_value(self) -> str | float | int | bool:
        tok = self._current
        if tok.type == TT.NUMBER:
            self._advance()
            v = tok.value
            return float(v) if "." in v or "e" in v.lower() else int(v)
        if tok.type == TT.STRING:
            self._advance()
            return tok.value.strip('"')
        if tok.type == TT.BOOL:
            self._advance()
            return tok.value.lower() == "true"
        if tok.type == TT.IDENT:
            self._advance()
            return tok.value
        raise ParseError(f"Expected attribute value, got {tok.type.name}", tok.line, tok.col)

    # ── parse attribute list:  key=value key=value ... ─────────────────────

    def _parse_attributes(self) -> list[Attribute]:
        attrs: list[Attribute] = []
        while self._current.type == TT.IDENT and self._peek().type == TT.EQ:
            key = self._advance().value
            self._advance()  # skip =
            value = self._parse_attr_value()
            attrs.append(Attribute(key=key, value=value))
        return attrs

    # ── parse connect(a, b) or connect(a) ────────────────────────────────

    def _parse_connect(self) -> tuple[str, str | None]:
        self._expect(TT.CONNECT)
        self._expect(TT.LPAREN)
        q1 = self._expect(TT.IDENT).value
        q2: str | None = None
        if self._current.type == TT.COMMA:
            self._advance()
            q2 = self._expect(TT.IDENT).value
        self._expect(TT.RPAREN)
        return q1, q2

    # ── parse qubit statement ─────────────────────────────────────────────

    def _parse_qubit(self) -> QubitNode:
        self._expect(TT.QUBIT)
        name = self._expect(TT.IDENT).value
        attrs = self._parse_attributes()
        # derive type from attributes
        qubit_type = "transmon"
        for a in attrs:
            if a.key == "type":
                qubit_type = str(a.value)
        return QubitNode(name=name, qubit_type=qubit_type, attributes=attrs)

    # ── parse coupler statement ───────────────────────────────────────────

    def _parse_coupler(self) -> CouplerNode:
        self._expect(TT.COUPLER)
        name = self._expect(TT.IDENT).value
        q1, q2 = self._parse_connect()
        if q2 is None:
            raise ParseError(f"Coupler {name} requires connect(q1, q2)", self._current.line, self._current.col)
        attrs = self._parse_attributes()
        return CouplerNode(name=name, qubit_a=q1, qubit_b=q2, attributes=attrs)

    # ── parse readout statement ───────────────────────────────────────────

    def _parse_readout(self) -> ReadoutNode:
        self._expect(TT.READOUT)
        name = self._expect(TT.IDENT).value
        q1, _ = self._parse_connect()
        attrs = self._parse_attributes()
        return ReadoutNode(name=name, target_qubit=q1, attributes=attrs)

    # ── parse resonator statement ─────────────────────────────────────────

    def _parse_resonator(self) -> ResonatorNode:
        self._expect(TT.RESONATOR)
        name = self._expect(TT.IDENT).value
        q1, _ = self._parse_connect()
        attrs = self._parse_attributes()
        return ResonatorNode(name=name, target_qubit=q1, attributes=attrs)

    # ── parse variable statement ──────────────────────────────────────────

    def _parse_variable(self) -> VariableNode:
        self._expect(TT.VARIABLE)
        name = self._expect(TT.IDENT).value
        self._expect(TT.EQ)
        value = self._parse_attr_value()
        return VariableNode(name=name, value=value)

    # ── parse chip block ──────────────────────────────────────────────────

    def _parse_chip(self) -> ChipNode:
        self._expect(TT.CHIP)
        name = self._expect(TT.IDENT).value
        chip = ChipNode(name=name)

        self._skip_newlines()

        while self._current.type not in (TT.END, TT.EOF, TT.CHIP):
            tok = self._current
            if tok.type == TT.QUBIT:
                chip.qubits.append(self._parse_qubit())
            elif tok.type == TT.COUPLER:
                chip.couplers.append(self._parse_coupler())
            elif tok.type == TT.READOUT:
                chip.readouts.append(self._parse_readout())
            elif tok.type == TT.RESONATOR:
                chip.resonators.append(self._parse_resonator())
            elif tok.type == TT.VARIABLE:
                chip.variables.append(self._parse_variable())
            elif tok.type == TT.NEWLINE:
                self._advance()
            else:
                raise ParseError(
                    f"Unexpected token inside chip block: {tok.type.name} ({tok.value!r})",
                    tok.line,
                    tok.col,
                )

            self._skip_newlines()

        if self._current.type == TT.END:
            self._advance()

        return chip

    # ── top-level parse ───────────────────────────────────────────────────

    def parse(self) -> Program:
        prog = Program()
        self._skip_newlines()

        while self._current.type != TT.EOF:
            if self._current.type == TT.CHIP:
                prog.chips.append(self._parse_chip())
            elif self._current.type == TT.NEWLINE:
                self._advance()
            else:
                tok = self._current
                raise ParseError(
                    f"Unexpected top-level token: {tok.type.name} ({tok.value!r})",
                    tok.line,
                    tok.col,
                )

        return prog


# ── Public API ─────────────────────────────────────────────────────────────


def parse(source: str) -> Program:
    """Tokenise and parse QCLang source.  Returns a Program AST."""
    tokens = tokenise(source)
    return Parser(tokens).parse()
