"""
QChipLang Compiler CLI
Usage: python -m qchiplang.compiler <input.qcl> [--target qiskit_metal|json_ir|spice] [--out file]
"""

import sys
import os
import argparse

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .lexer import Lexer, LexError
from .parser import Parser, ParseError, parse_qcl
from .analyzer import SemanticAnalyzer, analyze_qcl
from .codegen import compile_qcl


BANNER = r"""
  ___   ___ _    _      _    _
 / _ \ / __| |_ (_)_ __| |  __ _ _ _  __ _
| (_) | (__| ' \| | '_ \ |__/ _` | ' \/ _` |
 \__\_\\___|_||_|_| .__/____|__,_|_||_\__, |
                   |_|                |___/
  Application-Specific Superconducting Quantum Chip DSL
  v1.0  —  Targets Qiskit Metal + GDS + SPICE
"""


def compile_file(source: str, target: str = 'qiskit_metal', verbose: bool = False) -> tuple:
    """
    Full compilation pipeline: source → tokens → AST → analysis → code.
    Returns (output_code, metrics).
    """
    # 1. Lex
    try:
        lexer = Lexer(source)
        tokens = lexer.tokenize()
        if verbose:
            print(f"  [Lex]  {len(tokens)} tokens")
    except LexError as e:
        return None, str(e)

    # 2. Parse
    try:
        parser = Parser(tokens)
        prog = parser.parse()
        if verbose:
            print(f"  [Parse] {len(prog.qubits)} qubit decls, "
                  f"{len(prog.resonators)} resonators, "
                  f"{len(prog.tile_arrays)} tile arrays")
    except ParseError as e:
        return None, str(e)

    # 3. Analyze
    metrics = analyze_qcl(prog)
    if verbose:
        print(metrics)

    # 4. Generate
    try:
        code = compile_qcl(prog, target=target)
        return code, metrics
    except Exception as e:
        return None, str(e)


def main():
    print(BANNER)

    parser = argparse.ArgumentParser(
        prog='qcl',
        description='QChipLang compiler — Application-specific superconducting quantum chip DSL'
    )
    parser.add_argument('input', help='Input .qcl source file')
    parser.add_argument('--target', default='qiskit_metal',
                        choices=['qiskit_metal', 'json_ir', 'spice'],
                        help='Compilation target (default: qiskit_metal)')
    parser.add_argument('--out', help='Output file (default: stdout)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--analyze-only', action='store_true', help='Run DRC/analysis only, no codegen')
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    with open(args.input) as f:
        source = f.read()

    print(f"Compiling: {args.input}  →  {args.target}")
    print()

    code, metrics_or_err = compile_file(source, target=args.target, verbose=args.verbose)

    if code is None:
        print(f"Compilation failed: {metrics_or_err}", file=sys.stderr)
        sys.exit(1)

    print(metrics_or_err)

    if args.analyze_only:
        return

    if args.out:
        with open(args.out, 'w') as f:
            f.write(code)
        print(f"\nOutput written to: {args.out}")
    else:
        print("\n" + "─" * 60)
        print(code)


if __name__ == '__main__':
    main()
