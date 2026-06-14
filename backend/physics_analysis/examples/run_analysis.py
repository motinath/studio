#!/usr/bin/env python3
"""Example: Run a complete physics analysis on sample data.

Usage:
    python examples/run_analysis.py
"""

import json
import logging
import sys
from pathlib import Path

# Add src to path for development
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from physics_engine.models.em_results import EMResults
from physics_engine.models.design_spec import DesignSpec
from physics_engine.pipeline import PhysicsAnalysisPipeline


def main() -> None:
    """Load sample data, run physics analysis, print results."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s │ %(name)-30s │ %(levelname)-5s │ %(message)s",
        datefmt="%H:%M:%S",
    )

    examples_dir = Path(__file__).parent

    # Load sample data
    with open(examples_dir / "sample_em_results.json") as f:
        em_data = json.load(f)
    with open(examples_dir / "sample_design_spec.json") as f:
        design_data = json.load(f)

    em_results = EMResults.model_validate(em_data)
    design_spec = DesignSpec.model_validate(design_data)

    print("=" * 70)
    print("  SILICOFELLER PHYSICS ANALYSIS ENGINE")
    print(f"  Design: {design_spec.project_name}")
    print(f"  Qubits: {len(design_spec.qubits)}")
    print("=" * 70)

    # Run analysis
    pipeline = PhysicsAnalysisPipeline()
    report = pipeline.run(em_results, design_spec, output_dir="output")

    # Print summary
    print("\n" + "=" * 70)
    print("  RESULTS SUMMARY")
    print("=" * 70)
    print(f"  Overall Status: {report.overall_status.value}")
    print(f"  Physics Score:  {report.physics_score * 100:.1f}%")
    print()

    for qr in report.qubit_results:
        print(f"  {qr.qubit_id} ({qr.type.value}):")
        print(f"    Frequency:     {qr.computed.frequency_ghz:.4f} GHz")
        print(f"    Anharmonicity: {qr.computed.anharmonicity_mhz:.1f} MHz")
        print(f"    T1:            {qr.coherence.T1_effective_us:.1f} µs")
        print(f"    T2:            {qr.coherence.T2_effective_us:.1f} µs")
        print()

    if report.coupling_results:
        print("  Coupling:")
        for cr in report.coupling_results:
            print(f"    {cr.qubit_a}-{cr.qubit_b}: g={cr.bare_coupling_mhz:.1f} MHz, "
                  f"ZZ={cr.zz_coupling_khz:.1f} kHz")
        print()

    print(f"  Validation: {report.validation_summary.passed}/{report.validation_summary.total_checks} passed")
    if report.validation_summary.suggestions:
        print("  Suggestions:")
        for s in report.validation_summary.suggestions:
            print(f"    • {s}")
    print()

    # Save full report
    report_path = Path("output") / "physics_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        f.write(report.model_dump_json(indent=2))
    print(f"  Full report saved to: {report_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
