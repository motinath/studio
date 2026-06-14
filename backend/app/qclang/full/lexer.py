"""
QChipLang Lexer
Tokenizes .qcl source files into a token stream.
"""

import re
from dataclasses import dataclass
from enum import Enum, auto
from typing import List, Optional


class TT(Enum):
    # Literals
    IDENT       = auto()
    NUMBER      = auto()
    STRING      = auto()
    UNIT        = auto()

    # Keywords
    CHIP        = auto()
    QUBIT       = auto()
    RESONATOR   = auto()
    COUPLER     = auto()
    CONNECT     = auto()
    TOPOLOGY    = auto()
    TILE        = auto()
    TILE_ARRAY  = auto()
    FEEDLINE    = auto()
    FLUX_LINE   = auto()
    DRIVE_LINE  = auto()
    PACKAGE     = auto()
    IO_PORT     = auto()
    PROCESS_STACK = auto()
    LAYER       = auto()
    DESIGN_RULES = auto()
    APPLICATION = auto()
    SIMULATE    = auto()

    # Modifiers
    SWEEP       = auto()
    FROM_FILE   = auto()
    AUTO        = auto()
    TRUE        = auto()
    FALSE       = auto()

    # Symbols
    LBRACE      = auto()
    RBRACE      = auto()
    LBRACKET    = auto()
    RBRACKET    = auto()
    LPAREN      = auto()
    RPAREN      = auto()
    COLON       = auto()
    COMMA       = auto()
    DOT         = auto()
    DASH        = auto()
    CONNECT_OP  = auto()  # --
    RANGE_OP    = auto()  # 0:7
    EQ          = auto()  # =

    # Misc
    COMMENT     = auto()
    NEWLINE     = auto()
    EOF         = auto()
    ERROR       = auto()


KEYWORDS = {
    'chip': TT.CHIP,
    'qubit': TT.QUBIT,
    'resonator': TT.RESONATOR,
    'coupler': TT.COUPLER,
    'connect': TT.CONNECT,
    'topology': TT.TOPOLOGY,
    'tile': TT.TILE,
    'tile_array': TT.TILE_ARRAY,
    'feedline': TT.FEEDLINE,
    'flux_line': TT.FLUX_LINE,
    'drive_line': TT.DRIVE_LINE,
    'package': TT.PACKAGE,
    'io_port': TT.IO_PORT,
    'process_stack': TT.PROCESS_STACK,
    'layer': TT.LAYER,
    'design_rules': TT.DESIGN_RULES,
    'application': TT.APPLICATION,
    'simulate': TT.SIMULATE,
    'sweep': TT.SWEEP,
    'from_file': TT.FROM_FILE,
    'auto': TT.AUTO,
    'true': TT.TRUE,
    'false': TT.FALSE,
}

UNITS = {
    'Hz', 'kHz', 'MHz', 'GHz', 'THz',
    'nm', 'um', 'mm', 'cm',
    'ns', 'us', 'ms',
    'eV', 'meV',
    'deg', 'rad',
    'ohm', 'kohm',
    'pH', 'nH',
    'fF', 'pF',
    'dBm', 'mW', 'uW',
    'um2',
}


@dataclass
class Token:
    type: TT
    value: str
    line: int
    col: int

    def __repr__(self):
        return f"Token({self.type.name}, {self.value!r}, L{self.line}:{self.col})"


class LexError(Exception):
    def __init__(self, msg, line, col):
        super().__init__(f"[L{line}:{col}] LexError: {msg}")
        self.line = line
        self.col = col


class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.col = 1
        self.tokens: List[Token] = []

    def error(self, msg):
        raise LexError(msg, self.line, self.col)

    def peek(self, offset=0) -> Optional[str]:
        i = self.pos + offset
        return self.source[i] if i < len(self.source) else None

    def advance(self) -> str:
        ch = self.source[self.pos]
        self.pos += 1
        if ch == '\n':
            self.line += 1
            self.col = 1
        else:
            self.col += 1
        return ch

    def match(self, expected: str) -> bool:
        if self.pos < len(self.source) and self.source[self.pos] == expected:
            self.advance()
            return True
        return False

    def skip_whitespace(self):
        while self.pos < len(self.source) and self.source[self.pos] in ' \t\r':
            self.advance()

    def skip_comment(self):
        # // single-line
        if self.peek() == '/' and self.peek(1) == '/':
            while self.pos < len(self.source) and self.source[self.pos] != '\n':
                self.advance()

    def read_string(self) -> Token:
        line, col = self.line, self.col
        self.advance()  # consume opening "
        buf = []
        while self.pos < len(self.source) and self.source[self.pos] != '"':
            buf.append(self.advance())
        if self.pos >= len(self.source):
            self.error("Unterminated string")
        self.advance()  # consume closing "
        return Token(TT.STRING, ''.join(buf), line, col)

    def read_number_with_unit(self) -> List[Token]:
        """Read a number (possibly float) and optional unit.
        If followed immediately by alpha chars that don't match a known unit,
        treat the whole token as a string identifier (e.g. '2d_grid')."""
        line, col = self.line, self.col
        buf = []
        while self.pos < len(self.source) and (self.source[self.pos].isdigit() or self.source[self.pos] == '.'):
            buf.append(self.advance())
        number_str = ''.join(buf)

        # Peek at what follows — if it's alpha, could be unit or blended ident like '2d_grid'
        if self.pos < len(self.source) and (self.source[self.pos].isalpha() or self.source[self.pos] == '_'):
            suffix_line, suffix_col = self.line, self.col
            suffix_buf = []
            while self.pos < len(self.source) and (self.source[self.pos].isalnum() or self.source[self.pos] == '_'):
                suffix_buf.append(self.advance())
            suffix = ''.join(suffix_buf)
            if suffix in UNITS:
                return [
                    Token(TT.NUMBER, number_str, line, col),
                    Token(TT.UNIT, suffix, suffix_line, suffix_col),
                ]
            else:
                # Blended ident like '2d_grid' — return as IDENT string
                return [Token(TT.IDENT, number_str + suffix, line, col)]

        return [Token(TT.NUMBER, number_str, line, col)]

    def read_ident(self) -> Token:
        line, col = self.line, self.col
        buf = []
        while self.pos < len(self.source) and (self.source[self.pos].isalnum() or self.source[self.pos] in '_'):
            buf.append(self.advance())
        word = ''.join(buf)
        tt = KEYWORDS.get(word, TT.IDENT)
        return Token(tt, word, line, col)

    def tokenize(self) -> List[Token]:
        while self.pos < len(self.source):
            self.skip_whitespace()
            if self.pos >= len(self.source):
                break

            ch = self.source[self.pos]
            line, col = self.line, self.col

            if ch == '\n':
                self.advance()
                continue

            if ch == '/' and self.peek(1) == '/':
                self.skip_comment()
                continue

            if ch == '"':
                self.tokens.append(self.read_string())
                continue

            if ch.isdigit():
                self.tokens.extend(self.read_number_with_unit())
                continue

            if ch.isalpha() or ch == '_':
                self.tokens.append(self.read_ident())
                continue

            if ch == '-':
                self.advance()
                if self.peek() == '-':
                    self.advance()
                    self.tokens.append(Token(TT.CONNECT_OP, '--', line, col))
                else:
                    self.tokens.append(Token(TT.DASH, '-', line, col))
                continue

            if ch == ':':
                self.advance()
                self.tokens.append(Token(TT.COLON, ':', line, col))
                continue

            simple = {
                '{': TT.LBRACE, '}': TT.RBRACE,
                '[': TT.LBRACKET, ']': TT.RBRACKET,
                '(': TT.LPAREN, ')': TT.RPAREN,
                ',': TT.COMMA, '.': TT.DOT,
                '=': TT.EQ,
            }
            if ch in simple:
                self.advance()
                self.tokens.append(Token(simple[ch], ch, line, col))
                continue

            self.error(f"Unexpected character: {ch!r}")

        self.tokens.append(Token(TT.EOF, '', self.line, self.col))
        return self.tokens
