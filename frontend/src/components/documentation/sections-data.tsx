import React from "react";
import { AlertBox } from "./AlertBox";
import { CodeBlock } from "./CodeBlock";
import { DocumentationCard } from "./DocumentationCard";
import { FAQAccordion } from "./FAQAccordion";
import { HeroSection } from "./HeroSection";

export interface SectionProps {
  activeHash: string;
  onNavigate: (hash: string) => void;
}

export const SECTIONS_DATA: Record<string, React.FC<SectionProps>> = {
  "home": ({ activeHash, onNavigate }) => (
    <HeroSection onNavigate={onNavigate} />
  ),

  "getting-started": ({ activeHash, onNavigate }) => (
    <>




          <div className="section-heading">



            <div>



              <p className="eyebrow">Onboarding Tutorial</p>



              <h2>Onboarding Tutorial</h2>



            </div>



            <button className="copy-button" type="button" data-copy-section="getting-started">Copy page</button>



          </div>



          <p>



            This page introduces the QClang workflow from a foundational level. An engineer should first



            understand what a QClang source file represents, how it is parsed, how it becomes an



            internal design model, and how that model is exported to downstream chip design tools.



          </p>



          <ol className="learning-list">



            <li><strong>Foundational:</strong> learn chip, qubit, coupler, readout, and design rule parameters.</li>



            <li><strong>Intermediate:</strong> learn parse, validate, compile, and export stages.</li>



            <li><strong>Advanced:</strong> connect QClang with backend APIs, design graph, routing, DRC, and exports.</li>



          </ol>



        
    </>
  ),

  "hello-world": ({ activeHash, onNavigate }) => (
    <>




          <div className="section-heading">



            <div>



              <p className="eyebrow">Foundational</p>



              <h2>Hello World</h2>



            </div>



            <button className="copy-button" type="button" data-copy-section="hello-world">Copy page</button>



          </div>



          <p>



            A basic QClang example declares a single chip and fundamental hardware objects,



            demonstrating the structural syntax of the language before scaling to complex topologies.



          </p>



          <div className="code-card">



            <div className="code-title">hello.qc</div>



            <pre><code>chip HelloChip



  variable substrate = "silicon"



  variable metal = "aluminum"







  qubit Q1 type=transmon frequency=5.0



  readout RO_Q1 connect(Q1)



end</code></pre>



          </div>



          <div className="info-box">



            <strong>What this example introduces</strong>



            <p>Chip metadata, a single qubit, and a readout object connected to that qubit.</p>



          </div>



        
    </>
  ),

  "installation": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Setup</p>



          <h2>Installation</h2>



          <p>



            Configure the QClang compiler toolchain to integrate it with the chip synthesis backend.



            This guide outlines setting up the environment, compiling packages, and verifying paths



            for production workflows.



          </p>



          <div className="parameter-table">



            <article><strong>Backend root</strong><span>Project backend folder where QClang services run.</span></article>



            <article><strong>Compiler package</strong><span>QClang lexer, parser, validator, compiler, and full dialect modules.</span></article>



            <article><strong>Examples folder</strong><span>Place for sample .qc and .qcl files used by new users.</span></article>



          </div>



        
    </>
  ),

  "using-python": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Development</p>



          <h2>Using Python and QClang</h2>



          <p>



            Python is used to expose QClang compiler functions through backend services.



            This section should explain the normal developer flow: load source text, parse it,



            validate it, compile it, and return a structured response.



          </p>



          <div className="code-card">



            <div className="code-title">Conceptual flow</div>



            <pre><code>source = read_qclang_file("design.qc")



ast = parse(source)



validation = validate(ast)



result = compile(ast, target="json_ir")</code></pre>



          </div>



        
    </>
  ),

  "user-guide": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">User Guide</p>



          <h2>User Guide</h2>



          <p>



            The user guide should teach how QClang fits into the full quantum chip design workflow.



            It should stay practical: what users write, what the compiler reads, and what the backend returns.



          </p>



          <div className="pipeline">



            <article><span>1</span><h3>Write</h3><p>Create QClang source with chip, qubit, coupler, and readout declarations.</p></article>



            <article><span>2</span><h3>Validate</h3><p>Check structure, references, units, and design constraints.</p></article>



            <article><span>3</span><h3>Compile</h3><p>Generate design output for JSON inspection or chip design tooling.</p></article>



          </div>



        
    </>
  ),

  "qclang-overview": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Overview Tutorial</p>



          <h2>QClang Overview Tutorial</h2>



          <p>



            QClang is a small domain language for quantum chip design. It should describe a design



            in a readable way, then let the compiler convert that design into structured outputs.



          </p>



          <ul className="learning-list">



            <li><strong>Source language:</strong> the user-facing chip description.</li>



            <li><strong>AST:</strong> the internal parsed representation.</li>



            <li><strong>Design graph:</strong> the shared structure used by routing, DRC, and exports.</li>



            <li><strong>Generated output:</strong> the result returned to the frontend or saved as artifacts.</li>



          </ul>



        
    </>
  ),

  "syntax-part-1": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Syntax</p>



          <h2>Syntax Tutorial - Part 1</h2>



          <p>



            This section covers the core declaration syntaxes and structure of QClang files, focusing on



            variables, physical hardware blocks, and connectivity definitions.



          </p>



          <div className="two-column">



            <article><h3>Declarations</h3><p>Use declarations for chip, qubit, coupler, readout, feedline, and launchpad objects.</p></article>



            <article><h3>Properties</h3><p>Use properties for frequency, material, topology, chip size, spacing, and routing options.</p></article>



          </div>



        
    </>
  ),

  "syntax-part-2": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Syntax</p>



          <h2>Syntax Tutorial - Part 2</h2>



          <p>



            Advanced QClang syntax definitions allow specifying target layouts, physical design



            rule constraints, and compilation targets for hardware compilation.



            



          </p>



          <div className="parameter-table">



            <article><strong>Topology</strong><span>grid, heavy-hex, chain, or project-specific topology names.</span></article>



            <article><strong>Rules</strong><span>Spacing, frequency, fabrication, and connectivity constraints.</span></article>



            <article><strong>Targets</strong><span>qiskit_metal, json_ir, spice, qclang export, and design reports.</span></article>



          </div>



        
    </>
  ),

  "language-reference": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Language Reference</p>



          <h2>Language Blocks</h2>



          <p>



            This reference page documents the primary declarative block components supported by the



            QClang language specification. Each block maps directly to physical layout and



            synthesis parameters.



          </p>



          <div className="reference-grid">



            <article><h3>chip</h3><p>Defines global design metadata such as name, substrate, metal, topology, and chip size.</p></article>



            <article><h3>qubit</h3><p>Defines a quantum device node, usually with type, frequency, placement, and group parameters.</p></article>



            <article><h3>coupler</h3><p>Defines a connection between two qubits and optional coupling strength.</p></article>



            <article><h3>readout</h3><p>Defines readout resonator objects connected to target qubits.</p></article>



            <article><h3>feedline</h3><p>Defines the shared microwave route that connects readout components.</p></article>



            <article><h3>launchpad</h3><p>Defines chip input/output access points for routing and exports.</p></article>



          </div>



        
    </>
  ),

  "compiler-reference": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Compiler Reference</p>



          <h2>Compiler Pipeline</h2>



          <p>



            The QClang compiler utilizes a multi-stage translation pipeline that processes declarative



            source code into optimized intermediate representations and downstream synthesis models.



            



          </p>



          <table>



            <thead><tr><th>Stage</th><th>Purpose</th><th>Expected output</th></tr></thead>



            <tbody>



              <tr><td>Lexer</td><td>Reads source characters and creates tokens.</td><td>Token stream</td></tr>



              <tr><td>Parser</td><td>Builds the abstract syntax tree from tokens.</td><td>AST</td></tr>



              <tr><td>Validator</td><td>Checks structure, references, and required fields.</td><td>Validation report</td></tr>



              <tr><td>Compiler</td><td>Converts the parsed design into backend-ready output.</td><td>Generated result</td></tr>



              <tr><td>Full dialect</td><td>Supports extended .qcl features such as braces, arrays, and export targets.</td><td>JSON IR, SPICE, or Metal code</td></tr>



            </tbody>



          </table>



        
    </>
  ),

  "design-rules": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Design Rules</p>



          <h2>Design Rules</h2>



          <p>



            QClang documentation should include design rule parameters so users understand what



            the compiler or design pipeline may check later.



          </p>



          <div className="reference-grid">



            <article><h3>Geometry rules</h3><p>Spacing, overlap, off-chip placement, and route collision checks.</p></article>



            <article><h3>Frequency rules</h3><p>Qubit frequency spacing, readout separation, and collision avoidance.</p></article>



            <article><h3>Fabrication rules</h3><p>Minimum widths, clearances, material assumptions, and process constraints.</p></article>



            <article><h3>Connectivity rules</h3><p>Qubit-coupler-readout consistency and missing connection checks.</p></article>



          </div>



        
    </>
  ),

  "targets": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Compilation Targets</p>



          <h2>Compilation Targets</h2>



          <p>



            Targets describe where QClang output should go. In the final documentation,



            each target can include exact request/response examples and screenshots.



          </p>



          <div className="target-list">



            <article><h3>json_ir</h3><p>Structured intermediate representation for debugging and frontend inspection.</p></article>



            <article><h3>qiskit_metal</h3><p>Python code intended for quantum chip component generation workflows.</p></article>



            <article><h3>spice</h3><p>SPICE-style text for circuit-level representation.</p></article>



            <article><h3>exports</h3><p>Project exports such as QClang source, JSON, SVG, GDS, DXF, and reports.</p></article>



          </div>



        
    </>
  ),

  "chip-synthesis": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Chip Synthesis</p>



          <h2>Chip Synthesis</h2>



          <p>



            Chip synthesis documentation should explain how QClang source becomes a design graph,



            then goes through placement, frequency planning, routing, DRC, and export generation.



          </p>



          <div className="pipeline">



            <article><span>1</span><h3>Constraints</h3><p>Collect chip size, substrate, topology, metal, and qubit count.</p></article>



            <article><span>2</span><h3>Graph</h3><p>Create a design graph with qubits, couplers, readouts, feedlines, and launchpads.</p></article>



            <article><span>3</span><h3>Export</h3><p>Return generated artifacts for the user interface and downstream tooling.</p></article>



          </div>



        
    </>
  ),

  "superconducting-materials": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Chip Synthesis</p>
          <h2>Superconducting Materials</h2>
          <p className="section-lead">
            This page summarizes <strong>CDAC_Superconducting_Materials.pptx</strong> for QClang documentation.
            Use it to understand the material families that a superconducting quantum-chip design flow must describe
            before layout, fabrication, HFSS simulation, Q3D extraction, and EPR/scQubits analysis.
          </p>

          <div className="info-box">
            <strong>Learning goal</strong>
            <p>Superconducting quantum circuits require carefully selected materials across three functional layers: Each slide covers one material: Role · Properties · Critical Temperature · Importance for qubit coherence</p>
          </div>

          <div className="parameter-table material-family-grid">
            <article><strong>Superconducting Metals</strong><span>Aluminum (Al), Niobium (Nb), Molybdenum Rhenium (MoRe), and Indium (In). These materials form qubit electrodes, resonators, wiring, and flip-chip interconnects.</span></article><article><strong>Superconducting Compounds</strong><span>Titanium Nitride (TiN), Niobium Nitride (NbN), and Niobium Titanium Nitride (NbTiN). These support high kinetic inductance, photon detection, high-Q microwave circuits, and magnetic-field-tolerant designs.</span></article><article><strong>Substrates and Barriers</strong><span>Silicon (Si), Sapphire (Al2O3), and Aluminum Oxide (AlOx). These define the chip foundation and the Josephson junction tunnel barrier that creates qubit nonlinearity.</span></article>
          </div>
        
    </>
  ),

  "material-aluminum-al": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Aluminum (Al)</h2>
          <p className="section-lead">The Workhorse of Superconducting Qubits</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Tc = 1.2 K</p>
              <h3>Aluminum (Al)</h3>
              <p className="material-subtitle">The Workhorse of Superconducting Qubits</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Qubit body, Josephson junction electrodes, resonators, coplanar waveguides</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>Aluminum's native oxide (AlOx) forms a reproducible ~1–2 nm tunnel barrier for Josephson junctions — the heart of every superconducting qubit. Its long coherence times and CMOS-compatible deposition make it the most widely used qubit material worldwide, adopted by IBM, Google, IQM and in C-DAC's reference facility.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Type I superconductor — minimal trapped flux vortices</li><li>Naturally forms AlOx tunnel barrier (~1–2 nm thick)</li><li>Shadow evaporation enables precise Josephson junction fabrication</li><li>Used by IBM, Google, IQM {"&"} adopted in C-DAC reference facility</li><li>Low decoherence from TLS defects when surface is clean</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-niobium-nb": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Niobium (Nb)</h2>
          <p className="section-lead">High-Tc Superconductor for Resonators {"&"} Wiring</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Tc = 9.3 K</p>
              <h3>Niobium (Nb)</h3>
              <p className="material-subtitle">High-Tc Superconductor for Resonators {"&"} Wiring</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Microwave resonators, transmission lines, ground planes, multi-layer wiring</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>Niobium's higher critical temperature gives a wider thermal margin. It is the material of choice for resonators and readout structures in high-qubit-count processors. Sputter-deposited as thin films, it enables scalable multi-layer chip architectures essential for 50–100 qubit systems like those in C-DAC's program.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Type II superconductor — operates well in moderate magnetic fields</li><li>Widely used in SRF (superconducting radio-frequency) cavities</li><li>Preferred for multi-layer, high-qubit-count chip stacks</li><li>Sputter-deposited as thin films on Si or sapphire wafers</li><li>Critical for scalable quantum processor architectures</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-silicon-si-substrate": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Silicon (Si) Substrate</h2>
          <p className="section-lead">The Foundation of Most Quantum Chips</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Non-superconducting — dielectric substrate</p>
              <h3>Silicon (Si) Substrate</h3>
              <p className="material-subtitle">The Foundation of Most Quantum Chips</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Substrate / foundation for depositing superconducting thin films and qubit circuits</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>High-resistivity intrinsic silicon is the most common substrate because semiconductor fabrication techniques are directly compatible. It enables patterning of qubits using electron-beam and optical lithography at scale. C-DAC's reference facility uses silicon wafers for double-sided qubit chip fabrication.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Dielectric constant ~11.7; extremely well-characterised</li><li>Float-zone (intrinsic) Si has very low impurity levels</li><li>Compatible with standard cleanroom microfabrication tools</li><li>Loss tangent must be carefully managed at millikelvin temperatures</li><li>Used in double-sided 3-inch wafer fabrication at C-DAC partner labs</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-sapphire-al2o3-substrate": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Sapphire (Al₂O₃) Substrate</h2>
          <p className="section-lead">Ultra-Low-Loss Substrate for High-Coherence Qubits</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Non-superconducting — crystalline dielectric</p>
              <h3>Sapphire (Al₂O₃) Substrate</h3>
              <p className="material-subtitle">Ultra-Low-Loss Substrate for High-Coherence Qubits</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Low-loss substrate for high-coherence qubit circuits; alternative to silicon</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>Sapphire offers extremely low dielectric loss and a very clean surface, resulting in longer qubit coherence times (T1, T2). It is used in state-of-the-art processors where maximising coherence is critical. Google's Sycamore processor uses sapphire substrates.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Dielectric constant ~9–10; very low loss tangent</li><li>Single-crystal c-plane (0001) orientation preferred</li><li>Cleaner surfaces reduce two-level system (TLS) defects</li><li>Used in Google's Sycamore and many research-grade qubits globally</li><li>Higher cost than silicon but delivers superior coherence times</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-titanium-nitride-tin": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Titanium Nitride (TiN)</h2>
          <p className="section-lead">High Kinetic Inductance Superconductor</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Tc = 4–5.6 K (tunable)</p>
              <h3>Titanium Nitride (TiN)</h3>
              <p className="material-subtitle">High Kinetic Inductance Superconductor</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Kinetic inductance detectors (KIDs), high-impedance resonators, superconducting inductors</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>TiN has a large kinetic inductance arising from its high normal-state resistivity. This makes it ideal for compact high-impedance resonators and microwave kinetic inductance detectors (MKIDs). Its Tc is tunable by adjusting nitrogen content during reactive sputtering deposition.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>High kinetic inductance — enables compact circuit elements</li><li>Tc tunable via N₂ partial pressure during sputtering deposition</li><li>Hard, chemically stable coating — easy to pattern by etching</li><li>Used in microwave kinetic inductance detectors (MKIDs)</li><li>Studied at C-DAC partner labs for next-generation qubit designs</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-niobium-nitride-nbn": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Niobium Nitride (NbN)</h2>
          <p className="section-lead">High-Tc Nitride for Photon Detection {"&"} Qubits</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Tc = 16 K (bulk); ~10 K thin film</p>
              <h3>Niobium Nitride (NbN)</h3>
              <p className="material-subtitle">High-Tc Nitride for Photon Detection {"&"} Qubits</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Superconducting nanowire single-photon detectors (SNSPDs), resonators, qubit circuits</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>NbN has the highest Tc among common superconducting nitrides and is prized for single-photon detection at near-infrared wavelengths. Its large superconducting gap makes it resistant to quasiparticle poisoning — a key decoherence mechanism in qubit circuits used in quantum networking nodes.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Highest Tc among common nitrides — operable at 4 K with standard cryostats</li><li>Used in SNSPDs for quantum communication {"&"} networking links</li><li>Large superconducting gap reduces quasiparticle poisoning</li><li>Deposited by reactive magnetron sputtering on MgO or sapphire</li><li>Integrated into quantum networking nodes alongside transmon qubits</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-niobium-titanium-nitride-nbtin": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Niobium Titanium Nitride (NbTiN)</h2>
          <p className="section-lead">Optimised Alloy for Low-Loss Microwave Circuits</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Tc ≈ 15 K</p>
              <h3>Niobium Titanium Nitride (NbTiN)</h3>
              <p className="material-subtitle">Optimised Alloy for Low-Loss Microwave Circuits</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>High-Q microwave resonators, MKID arrays, qubit coupling elements, SQUIDs</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>NbTiN combines the high Tc of NbN with improved thin-film uniformity and magnetic field resilience. It is widely used for microwave resonators requiring both high quality factor (Q) and resilience to in-plane magnetic fields, making it superior for large-scale qubit arrays and flux-tunable designs.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Higher Q resonators compared to plain Nb films</li><li>Resilient to in-plane magnetic fields — ideal for fluxonium qubits</li><li>Excellent film uniformity over large (4-inch+) wafers</li><li>Critical for SQUIDs and superconducting interference devices</li><li>Adopted in European quantum platforms (QuTech, IQM) and C-DAC partners</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-aluminum-oxide-alox-tunnel-barrier": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Aluminum Oxide (AlOx) Tunnel Barrier</h2>
          <p className="section-lead">The Quantum Tunneling Element — Heart of the Josephson Junction</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Non-superconducting amorphous dielectric (~1–3 nm)</p>
              <h3>Aluminum Oxide (AlOx) Tunnel Barrier</h3>
              <p className="material-subtitle">The Quantum Tunneling Element — Heart of the Josephson Junction</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Insulating tunnel barrier in Al/AlOx/Al Josephson junctions — defines qubit nonlinearity</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>The AlOx tunnel barrier is the most critical element in superconducting qubits. Formed by controlled thermal oxidation of aluminum, it creates a ~1–2 nm amorphous oxide through which Cooper pairs tunnel, producing the non-linear inductance that makes a qubit distinct from a classical LC oscillator.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Formed by controlled O₂ exposure of Al surface (thermal oxidation)</li><li>Thickness (~1–2 nm) sets the critical current Ic of the junction</li><li>Amorphous structure introduces TLS defects — primary decoherence source</li><li>Shadow-angle evaporation produces self-aligned Josephson junctions</li><li>Active C-DAC research: cleaner barriers to extend T1 coherence times</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-molybdenum-rhenium-more": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Molybdenum Rhenium (MoRe)</h2>
          <p className="section-lead">Emerging Alloy for Resilient Qubit Circuits</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Tc ≈ 9–14 K (varies with Re content)</p>
              <h3>Molybdenum Rhenium (MoRe)</h3>
              <p className="material-subtitle">Emerging Alloy for Resilient Qubit Circuits</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Josephson junction electrodes, qubit wiring in magnetic-field-tolerant and hybrid designs</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>MoRe alloys offer a tunable Tc and are highly compatible with silicon nanofabrication processes. They are being explored for qubit designs that must tolerate small magnetic fields, including topological qubit experiments using Majorana zero modes in semiconductor-superconductor hybrid systems.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Tc tunable by adjusting the Mo:Re ratio during co-sputtering</li><li>Compatible with semiconductor (Si) foundry fabrication processes</li><li>Used in hybrid semiconductor-superconductor qubit devices</li><li>Explored for Majorana-based topological qubit research (Microsoft)</li><li>Under evaluation at leading quantum labs and C-DAC ecosystem partners</li></ul>
            </div>
          </article>
        
    </>
  ),

  "material-indium-in-bump-bonds": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Indium (In) Bump Bonds</h2>
          <p className="section-lead">Superconducting 3D Integration for Scalable Processors</p>

          <article className="material-card material-card-page">
            <div>
              <p className="eyebrow">Tc = 3.4 K</p>
              <h3>Indium (In) Bump Bonds</h3>
              <p className="material-subtitle">Superconducting 3D Integration for Scalable Processors</p>
            </div>
            <div className="material-detail">
              <strong>Role in quantum circuits</strong>
              <p>Flip-chip indium bump bonds for 3D multi-chip quantum processor stacking</p>
            </div>
            <div className="material-detail">
              <strong>Why it matters</strong>
              <p>Indium is soft and ductile, making it ideal for superconducting bump bonds that connect multiple quantum chips in a 3D flip-chip stack. This technique, pioneered by Google and IBM, enables qubit chips and control chips to be connected with low-loss superconducting contacts, crucial for scaling beyond 100 qubits.</p>
            </div>
            <div className="material-detail">
              <strong>Key facts</strong>
              <ul><li>Low melting point (157°C) — compatible with quantum chip processing</li><li>Soft metal: forms reliable superconducting bump bonds under low pressure</li><li>Superconducting at 3.4 K — well below qubit operating temperature (~15 mK)</li><li>Enables scalable 3D quantum processor stacking architectures</li><li>Evaluated for C-DAC reference facility 50–100 qubit multi-chip modules</li></ul>
            </div>
          </article>
        
    </>
  ),

  "materials-summary": ({ activeHash, onNavigate }) => (
    <>

          <p className="eyebrow">Superconducting Materials</p>
          <h2>Materials Summary</h2>
          <p className="section-lead">Quick comparison table from <strong>CDAC_Superconducting_Materials.pptx</strong>.</p>
          <div className="result-table-wrap material-summary-table">
            <table className="data-table">
              <thead>
                <tr><th>Material</th><th>Type</th><th>Tc</th><th>Primary Use</th></tr>
              </thead>
              <tbody>
                <tr><td>Aluminum (Al)</td><td>Superconductor</td><td>1.2 K</td><td>Qubit body, JJ electrodes</td></tr><tr><td>Niobium (Nb)</td><td>Superconductor</td><td>9.3 K</td><td>Resonators, wiring layers</td></tr><tr><td>Silicon (Si)</td><td>Substrate</td><td>—</td><td>Qubit chip foundation</td></tr><tr><td>Sapphire (Al₂O₃)</td><td>Substrate</td><td>—</td><td>High-coherence substrate</td></tr><tr><td>Titanium Nitride (TiN)</td><td>Compound SC</td><td>4–5.6 K</td><td>High-kinetic-inductance elements</td></tr><tr><td>Niobium Nitride (NbN)</td><td>Compound SC</td><td>16 K</td><td>SNSPDs, resonators</td></tr><tr><td>NbTiN</td><td>Compound SC</td><td>15 K</td><td>High-Q resonators, SQUIDs</td></tr><tr><td>AlOx (tunnel barrier)</td><td>Dielectric</td><td>—</td><td>Josephson junction tunnel barrier</td></tr><tr><td>MoRe alloy</td><td>Superconductor</td><td>9–14 K</td><td>Hybrid / topological qubits</td></tr><tr><td>Indium (In)</td><td>Superconductor</td><td>3.4 K</td><td>3D flip-chip bump bonds</td></tr>
              </tbody>
            </table>
          </div>
        
    </>
  ),

  "synthesis-tutorial": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Synthesis Tutorial</p>



          <h2>Synthesis Tutorial</h2>



          <p>



            This tutorial outlines the high-level quantum chip synthesis pipeline, including



            source input parsing, design constraint extraction, graph generation, component routing, and layout export.



          </p>



          <div className="info-box">



            <strong>Optimization Pipeline</strong>



            <p>By default, the compiler performs dead-code elimination on unused qubits and optimizes routing paths.</p>



          </div>



        
    </>
  ),

  "hfss-tutorial": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">HFSS Tutorial</p>



          <h2>HFSS Electromagnetic Simulation</h2>



          <p>



            HFSS is a full-wave 3D electromagnetic field solver used to test and analyze



            RF, microwave, antenna, and superconducting quantum circuit designs before manufacturing.



            In the QClang documentation, place this tutorial after chip synthesis because the synthesized



            chip geometry becomes the input for electromagnetic simulation.



          </p>



          <figure className="tutorial-figure">



            <img src="/docs/assets/tutorials/hfss-quantum-circuit.png" alt="HFSS superconducting quantum circuit analysis" />



            <figcaption>HFSS tutorial image: superconducting quantum circuit, transmon, resonator, field distribution, and fabrication layers.</figcaption>



          </figure>



          <div className="parameter-table">



            <article><strong>Why HFSS is needed</strong><span>It predicts device performance before manufacturing, reduces design mistakes, and saves prototype cost.</span></article>



            <article><strong>Core method</strong><span>HFSS uses the Finite Element Method to solve Maxwell's equations in complex 3D geometries.</span></article>



            <article><strong>Driven Modal</strong><span>Used for antennas, filters, waveguides, S-parameters, field overlays, gain, and radiation patterns.</span></article>



            <article><strong>Driven Terminal</strong><span>Used for PCB traces, connectors, cables, voltage/current behavior, impedance, and signal integrity.</span></article>



            <article><strong>Eigenmode</strong><span>Finds natural resonant frequencies, cavity modes, waveguide cutoffs, and Q-factors without ports.</span></article>



            <article><strong>Results</strong><span>Field plots, S11 reflection, S21 transmission, resonant frequencies, and quantum circuit field behavior.</span></article>



          </div>



          <div className="figure-grid">



            <figure><img src="/docs/assets/tutorials/hfss-workflow.png" alt="HFSS workflow" /><figcaption>Workflow: geometry, materials, boundaries, mesh, simulation, results.</figcaption></figure>



            <figure><img src="/docs/assets/tutorials/hfss-field.png" alt="HFSS field visualization" /><figcaption>Field visualization used to inspect electromagnetic behavior.</figcaption></figure>



          </div>



        
    </>
  ),

  "q3d-tutorial": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Q3D Analysis Tutorial</p>



          <h2>Q3D Extractor Analysis</h2>



          <p>



            Q3D analysis belongs after HFSS in the documentation because it explains how a



            quantum chip layout is converted into electrical interaction values. Q3D helps



            analyze capacitance, coupling, electric field strength, and unwanted interaction



            before fabrication.



          </p>



          <figure className="tutorial-figure">



            <img src="/docs/assets/tutorials/q3d-aedt-interface.png" alt="ANSYS AEDT Q3D interface" />



            <figcaption>Q3D tutorial image: AEDT interface showing geometry, fields, and extraction workflow.</figcaption>



          </figure>



          <ol className="learning-list">



            <li><strong>Quantum chip layout:</strong> start from qubits, resonators, readout lines, control lines, and ground plane.</li>



            <li><strong>Import into AEDT:</strong> bring the geometry into ANSYS Electronics Desktop.</li>



            <li><strong>Open Q3D Extractor:</strong> analyze electrical interactions between physical structures.</li>



            <li><strong>Assign materials:</strong> apply aluminum, silicon, sapphire, niobium, or project-specific materials.</li>



            <li><strong>Generate mesh:</strong> divide the structure into small elements for calculation accuracy.</li>



            <li><strong>Calculate fields:</strong> inspect electric field strength, direction, and energy concentration.</li>



            <li><strong>Extract capacitance matrix:</strong> convert physical geometry into electrical information.</li>



          </ol>



          <div className="figure-grid">



            <figure><img src="/docs/assets/tutorials/q3d-chip-layout.png" alt="Q3D quantum chip layout" /><figcaption>Input layout: qubits, readout lines, control lines, and ground plane.</figcaption></figure>



            <figure><img src="/docs/assets/tutorials/q3d-capacitance-matrix.png" alt="Q3D capacitance matrix" /><figcaption>Capacitance matrix: diagonal values are self-capacitance; off-diagonal values show component interaction.</figcaption></figure>



          </div>



          <div className="info-box">



            <strong>How to explain color fields</strong>



            <p>Red or yellow means strong electric field, green means medium field, and blue means weak field.</p>



          </div>



        
    </>
  ),

  "epr-tutorial": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">EPR / scQubits Tutorial</p>



          <h2>EPR Analysis in Superconducting Quantum Circuits</h2>



          <p>



            EPR means Energy Participation Ratio. It explains what percentage of total



            electromagnetic energy is stored in each circuit component. In QClang documentation,



            place EPR after HFSS and Q3D because EPR converts field simulation information into



            quantum parameters such as qubit frequency, anharmonicity, coupling strength, and Kerr effects.



          </p>



          <div className="figure-grid">



            <figure><img src="/docs/assets/tutorials/epr-transmon.png" alt="Transmon qubit structure" /><figcaption>Transmon qubit: capacitor plus Josephson junction structure.</figcaption></figure>



            <figure><img src="/docs/assets/tutorials/epr-josephson.png" alt="Josephson junction diagram" /><figcaption>Josephson junction: two superconductors separated by a thin insulating layer.</figcaption></figure>



            <figure><img src="/docs/assets/tutorials/epr-field.png" alt="EPR field energy visualization" /><figcaption>Field-energy visualization used before participation analysis.</figcaption></figure>



          </div>



          <div className="parameter-table">



            <article><strong>Why EPR is needed</strong><span>It predicts qubit behavior before fabrication and reduces trial-and-error design iterations.</span></article>



            <article><strong>Energy distribution</strong><span>It shows how energy is shared between capacitor, Josephson junction, resonator, and other modes.</span></article>



            <article><strong>HFSS relationship</strong><span>HFSS calculates fields; EPR converts field information into quantum circuit parameters.</span></article>



            <article><strong>Parameters obtained</strong><span>Qubit frequency, anharmonicity, coupling strength, Kerr effects, and mode interactions.</span></article>



            <article><strong>Industry use</strong><span>Used in superconducting qubit research, academic labs, circuit QED workflows, and scalable chip studies.</span></article>



            <article><strong>scQubits placement</strong><span>Use scQubits-style analysis after EM simulation to display Hamiltonian, energy levels, coherence, participation, and interactions.</span></article>



          </div>



        
    </>
  ),

  "simulation-dashboard": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Simulation Dashboard Tutorial</p>



          <h2>Simulation Dashboard Parameters</h2>



          <p>



            This tutorial describes where the simulation screens from the provided images should live.



            In the final QClang documentation, add screenshots here showing HFSS eigenmode simulation,



            model tree, material layers, object properties, field visualization, mesh settings, and progress status.



          </p>



          <div className="reference-grid">



            <article><h3>HFSS Eigenmode Simulation</h3><p>Document the 3D model view, setup tabs, logs, results, files, progress bar, and solver status.</p></article>



            <article><h3>Model Tree</h3><p>Explain substrate, metal layers, qubits, couplers, readout resonators, flux lines, ports, boundaries, and excitations.</p></article>



            <article><h3>Field Visualization</h3><p>Show E-field plots, color legends, frequency selection, vector display, cross section, and measurements.</p></article>



            <article><h3>Simulation List</h3><p>Document total simulations, running/completed/failed counts, filters, rows, side preview, and export actions.</p></article>



          </div>



        
    </>
  ),

  "results-reports": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Results and Reports Tutorial</p>



          <h2>Results, Verification, and Reports</h2>



          <p>



            Place final result screenshots here. This page should explain how users read simulation



            outputs after HFSS and EPR/scQubits analysis: qubit frequency distribution, energy levels,



            coupling maps, coherence summary, verification status, artifacts, and downloadable reports.



          </p>



          <div className="parameter-table">



            <article><strong>Summary metrics</strong><span>Total qubits, average qubit frequency, anharmonicity, T1, T2, coherence, gates, and status.</span></article>



            <article><strong>Qubit table</strong><span>Frequency, anharmonicity, T1, T2, coherence, participation ratio, and pass/fail status.</span></article>



            <article><strong>Physics plots</strong><span>Frequency histogram, coupling map, energy levels, Hamiltonian summary, and performance estimates.</span></article>



            <article><strong>Verification summary</strong><span>Design rule, frequency, coupling, coherence, fabrication, and custom checks.</span></article>



            <article><strong>Artifacts</strong><span>HFSS results, scQubits results, capacitance matrix, Hamiltonian data, and PDF reports.</span></article>



            <article><strong>Reports</strong><span>Generate and download complete analysis reports after final simulation completion.</span></article>



          </div>



        
    </>
  ),

  "execution-part-1": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Execution Tutorial</p>



          <h2>Execution Tutorial - Part 1</h2>



          <p>



            This page explains the first execution stage for QClang documentation users.



            After a QClang file is written and checked by the compiler, the design should be



            exported into simulation-ready artifacts such as JSON IR, geometry data, or



            electromagnetic setup files.



          </p>



          <div className="parameter-table">



            <article><strong>Input</strong><span>A validated <code>.qcl</code> chip description with qubits, resonators, couplers, ports, and constraints.</span></article>



            <article><strong>Compiler output</strong><span>Structured intermediate representation and design artifacts that simulation tools can consume.</span></article>



            <article><strong>Simulation handoff</strong><span>Use this stage before HFSS, Q3D, and EPR analysis pages.</span></article>



            <article><strong>User goal</strong><span>Confirm that the design intent is converted into a usable simulation workflow.</span></article>



          </div>



        
    </>
  ),

  "execution-part-2": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Execution Tutorial</p>



          <h2>Execution Tutorial - Part 2</h2>



          <p>



            This page explains the second execution stage: reading simulation outputs and



            connecting them back to QClang design decisions. Users should compare HFSS,



            Q3D, and EPR/scQubits values against the result-analysis tables.



          </p>



          <div className="parameter-table">



            <article><strong>HFSS review</strong><span>Check S-parameters, resonator response, field concentration, crosstalk, and convergence.</span></article>



            <article><strong>Q3D review</strong><span>Check extracted capacitance, coupling, coherence-related thresholds, yield, and system quality.</span></article>



            <article><strong>EPR review</strong><span>Check participation ratios, Hamiltonian parameters, loss channels, qubit metrics, and scQubits outputs.</span></article>



            <article><strong>Final decision</strong><span>Use the analysis pages to decide whether the QClang design is ready, marginal, or needs redesign.</span></article>



          </div>



        
    </>
  ),

  "hfss-results-analysis": ({ activeHash, onNavigate }) => (
    <>

        <p className="eyebrow">Results Analysis</p>
        <h2>HFSS Results Analysis</h2>
        <p className="section-lead">HFSS results explain how the QClang-generated chip behaves electromagnetically. This page has been updated from <strong>HFSS_Quantum_Parameters (1).pptx</strong> and grouped so learners can study one simulation category at a time.</p>
        <div className="parameter-table"><article><strong>Quantum Computing — SilicoFeller Format</strong><span>52</span></article><article><strong>Parameters</strong><span>7</span></article><article><strong>Categories</strong><span>26</span></article><article><strong>Critical</strong><span>Sources: IEEE / APS Research Papers {"&"} Doctoral Theses (2004–2024)</span></article></div>
        <div className="result-workbook grouped-results">
        <details className="result-sheet result-root"><summary><span>HFSS Simulation Output Parameters</span><small>52 parameters grouped into 7 categories</small></summary><div className="result-nested">
        <details className="result-category" id="hfss-s-parameters"><summary>S-Parameters {"&"} RF Performance</summary><p className="category-note">RF checks for matching, transmission, isolation, coupling, phase response, and standing-wave behavior.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>VER ID</th><th>Parameter</th><th>Severity</th><th>Design Rule / Constraint</th><th>Ideal / Optimal Value</th><th>Acceptable Range</th><th>Good</th><th>Bad</th><th>Why It Matters</th></tr></thead><tbody><tr><td>1</td><td>HFSS-S-001</td><td>Return Loss</td><td>Critical</td><td>S11 ≤ −20 dB at operating frequency</td><td>{"<"} −20 dB</td><td>−15 to −25 dB</td><td>{"<"} −20 dB: excellent impedance match; full power into resonator/qubit</td><td>{">"} −10 dB: {">"}10% power reflected; readout chain SNR degraded</td><td>Reflected power from input port. Poor return loss = impedance mismatch → signal reflections degrade qubit readout fidelity.</td></tr><tr><td>2</td><td>HFSS-S-002</td><td>Insertion Loss</td><td>Critical</td><td>S21 ≥ −0.1 dB in passband</td><td>{"<"} −0.1 dB</td><td>−0.1 to −1 dB</td><td>{"<"} −0.1 dB: near-lossless transmission; signal integrity preserved</td><td>{">"} −3 dB: half power lost; readout SNR {"<"} 3 dB, fidelity severely impacted</td><td>Signal transmission efficiency. High insertion loss reduces readout SNR, requiring higher drive power that heats the device.</td></tr><tr><td>3</td><td>HFSS-S-003</td><td>Transmission |S21|</td><td>High</td><td>|S21| ≥ 0.95 (linear) in passband</td><td>≈ 1.0 (unity)</td><td>0.9 – 1.0</td><td>≥ 0.95: {">"}90% amplitude transmission; strong coupling confirmed</td><td>{"<"} 0.5: {">"}50% amplitude loss; readout inefficient</td><td>Linear magnitude of S21. Near-unity confirms full coupling efficiency; used in EPR extraction and resonator characterisation.</td></tr><tr><td>4</td><td>HFSS-S-004</td><td>Port Isolation</td><td>High</td><td>Sij ≤ −30 dB between non-coupled ports</td><td>{"<"} −30 dB</td><td>−20 to −40 dB</td><td>{"<"} −30 dB: crosstalk negligible; simultaneous multi-qubit readout viable</td><td>{">"} −15 dB: strong port coupling; driven rotations on idle qubits</td><td>Cross-port electromagnetic isolation. Insufficient isolation causes simultaneous readout errors and qubit–qubit cross-drive.</td></tr><tr><td>5</td><td>HFSS-S-005</td><td>Forward Isolation (S12)</td><td>High</td><td>S12 ≤ −20 dB (Purcell filter context)</td><td>{"<"} −20 dB</td><td>−15 to −30 dB</td><td>{"<"} −20 dB: amplifier backaction blocked; qubit protected from output noise</td><td>{">"} −10 dB: HEMT noise reaches qubit; excess excitation and T₁ degradation</td><td>Reverse isolation prevents HEMT amplifier noise photons from reaching qubit. Critical in Purcell filter and circulator design.</td></tr><tr><td>6</td><td>HFSS-S-006</td><td>Phase of S21 (GDD)</td><td>Medium</td><td>Group delay deviation {"<"} 1 ns across qubit bandwidth</td><td>Linear phase</td><td>{"<"} 5° deviation</td><td>Linear phase: negligible pulse distortion; gate calibration stable</td><td>Non-linear phase: pulse distortion → systematic gate errors</td><td>Non-linear phase response causes group delay dispersion that distorts shaped control pulses, increasing gate error.</td></tr><tr><td>7</td><td>HFSS-S-007</td><td>Coupling Coefficient κ</td><td>Critical</td><td>1 MHz ≤ κ/2π ≤ 10 MHz (readout resonator)</td><td>1 – 5 MHz</td><td>0.5 – 20 MHz</td><td>1–5 MHz: fast readout ({"<"} 1 µs) with Purcell rate {"<"} 1 kHz; near quantum limit</td><td>{"<"} 0.1 MHz: readout {">"} 10 µs; {">"} 100 MHz: Purcell collapse of T₁</td><td>External coupling rate of readout resonator. Sets fundamental trade-off between measurement speed and Purcell-induced qubit decay.</td></tr><tr><td>8</td><td>HFSS-S-008</td><td>VSWR</td><td>Medium</td><td>VSWR ≤ 1.1 : 1 at operating frequency</td><td>{"<"} 1.1 : 1</td><td>1.1 – 1.5 : 1</td><td>{"<"} 1.1:1: {">"}99% power transfer; standing waves negligible</td><td>{">"} 2.0:1: standing waves cause frequency-dependent errors</td><td>Voltage standing wave ratio quantifies impedance mismatch. High VSWR degrades power delivery to qubit and readout resonator.</td></tr></tbody></table></div></details><details className="result-category" id="hfss-resonator-cavity"><summary>Resonator {"&"} Cavity Parameters</summary><p className="category-note">Resonator and cavity checks that control readout speed, coupling, Q factors, impedance, and frequency placement.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>VER ID</th><th>Parameter</th><th>Severity</th><th>Design Rule / Constraint</th><th>Ideal / Optimal Value</th><th>Acceptable Range</th><th>Good</th><th>Bad</th><th>Why It Matters</th></tr></thead><tbody><tr><td>9</td><td>HFSS-R-001</td><td>Resonant Frequency f₀</td><td>Critical</td><td>4.0 GHz ≤ f₀ ≤ 8.0 GHz; detuned ≥ 300 MHz from qubit</td><td>5 – 7 GHz</td><td>4 – 8 GHz</td><td>5–7 GHz: low thermal photon occupancy; standard coax hardware</td><td>{"<"} 1 GHz: thermal excitation; {">"} 15 GHz: lossy substrate</td><td>Resonator frequency sets readout photon energy, hardware requirements, and Purcell rate via qubit–resonator detuning.</td></tr><tr><td>10</td><td>HFSS-R-002</td><td>Loaded Q (Q_L)</td><td>Critical</td><td>Q_L ~ 5,000–20,000 (readout); {">"} 10⁶ (memory)</td><td>5,000 – 20,000</td><td>1,000 – 50,000</td><td>5k–20k: readout BW 250–1000 kHz; fast measurement with acceptable Purcell</td><td>{"<"} 500: too leaky; rapid Purcell decay; {">"} 10⁶ readout: extremely slow</td><td>Loaded Q determines readout bandwidth κ = ω₀/Q_L. Governs measurement time and Purcell-limited qubit T₁.</td></tr><tr><td>11</td><td>HFSS-R-003</td><td>Internal Q (Q_i)</td><td>Critical</td><td>Q_i ≥ 10⁵ (2D planar); ≥ 10⁷ (3D cavity)</td><td>{">"} 10⁶</td><td>10⁵ – 10⁷</td><td>{">"} 10⁶: resonator loss {"<"}{"<"} Purcell loss; qubit T₁ not resonator-limited</td><td>{"<"} 10⁴: resonator dominates T₁ budget; unacceptable in planar SC circuits</td><td>Internal Q reflects intrinsic material, TLS, and vortex losses in resonator walls. Sets upper limit on qubit T₁ via Purcell.</td></tr><tr><td>12</td><td>HFSS-R-004</td><td>External Q (Q_e)</td><td>High</td><td>Q_e ~ 2,000 – 50,000 (readout)</td><td>2,000 – 20,000</td><td>500 – 100,000</td><td>2k–20k: controllable readout rate; Purcell rate {"<"} qubit decay rate</td><td>{"<"} 100: over-coupled; Purcell T₁ {"<"} 1 µs; {">"} 10⁶: under-coupled</td><td>External Q sets coupling to transmission line. With Q_i {">"}{">"} Q_e (over-coupled), resonator is readout-limited not loss-limited.</td></tr><tr><td>13</td><td>HFSS-R-005</td><td>Coupling Strength g</td><td>Critical</td><td>50 MHz ≤ g/2π ≤ 200 MHz (strong coupling)</td><td>50 – 150 MHz</td><td>10 – 300 MHz</td><td>50–150 MHz: well in strong coupling; g/κ {">"} 10 and g/γ {">"} 10 confirmed</td><td>{"<"} 1 MHz: weak coupling; cQED regime not achieved; readout fidelity {"<"} 90%</td><td>Qubit–resonator coupling. Strong coupling (g {">"}{">"} κ, γ) is fundamental requirement for circuit QED dispersive readout.</td></tr><tr><td>14</td><td>HFSS-R-006</td><td>Dispersive Shift χ</td><td>Critical</td><td>0.5 MHz ≤ |χ|/2π ≤ 10 MHz</td><td>1 – 5 MHz</td><td>0.1 – 20 MHz</td><td>1–5 MHz: large IQ-plane separation; high-fidelity single-shot readout</td><td>{"<"} 0.01 MHz: states indistinguishable; {">"} 50 MHz: photon-induced dephasing</td><td>State-dependent resonator frequency shift enables QND readout. χ = g²/Δ sets IQ-plane angle; drives single-shot fidelity.</td></tr><tr><td>15</td><td>HFSS-R-007</td><td>Photon Decay Rate κ</td><td>High</td><td>κ/2π = 1 – 5 MHz (readout resonator)</td><td>1 – 5 MHz</td><td>0.1 – 20 MHz</td><td>1–5 MHz: readout ring-up/ring-down time ~100–500 ns; compatible with 1 µs cycles</td><td>{"<"} 10 kHz: readout too slow; {">"} 100 MHz: broad resonator; Purcell collapse</td><td>Resonator energy decay rate sets readout speed. Too small → slow readout; too large → Purcell-limited T₁.</td></tr><tr><td>16</td><td>HFSS-R-008</td><td>Impedance Z₀</td><td>Medium</td><td>Z₀ = 50 Ω ± 2 Ω (matched to coax)</td><td>50 Ω</td><td>45 – 55 Ω</td><td>50 Ω ± 1 Ω: VSWR {"<"} 1.05; full power coupling, no reflections in cryo lines</td><td>{"<"} 25 Ω or {">"} 100 Ω: VSWR {">"} 2; large reflections; effective κ shifts from design</td><td>Characteristic impedance matching to 50 Ω coaxial environment. Mismatch reduces coupling efficiency and shifts κ from design.</td></tr><tr><td>17</td><td>HFSS-R-009</td><td>Frequency Pulling Δf</td><td>Medium</td><td>Δf {"<"} 1 MHz from design target</td><td>{"<"} 0.5 MHz</td><td>{"<"} 2 MHz</td><td>{"<"} 0.5 MHz: resonator on-frequency; readout pulse pre-calibrated</td><td>{">"} 5 MHz: readout tone off-resonance; SNR degraded; tone calibration required</td><td>Frequency shift due to coupling, fabrication tolerances, or dielectric loading. Excess pulling requires per-device calibration.</td></tr><tr><td>18</td><td>HFSS-R-010</td><td>Kinetic Inductance α</td><td>Low</td><td>0.01 ≤ α ≤ 0.3 for standard Al/Nb resonators</td><td>0.05 – 0.2</td><td>0.001 – 0.5</td><td>0.05–0.2: moderate nonlinearity; resonator frequency stable vs power</td><td>{">"} 0.8: strong nonlinearity; resonator bifurcates at readout photon numbers</td><td>Kinetic inductance fraction α = L_k/(L_k+L_geo). Controls resonator nonlinearity, power handling, and anharmonicity contribution.</td></tr></tbody></table></div></details><details className="result-category" id="hfss-em-fields"><summary>Electromagnetic Field Outputs</summary><p className="category-note">Field-solution checks for peak fields, surface/interface participation, EPR participation, and radiation quality.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>VER ID</th><th>Parameter</th><th>Severity</th><th>Design Rule / Constraint</th><th>Ideal / Optimal Value</th><th>Acceptable Range</th><th>Good</th><th>Bad</th><th>Why It Matters</th></tr></thead><tbody><tr><td>19</td><td>HFSS-E-001</td><td>Peak E-Field |E|max</td><td>High</td><td>|E|max {"<"} 10⁶ V/m at junction (single photon)</td><td>{"<"} 10⁵ V/m</td><td>{"<"} 10⁷ V/m</td><td>{"<"} 10⁵ V/m: well below oxide breakdown; TLS excitation rate suppressed</td><td>{">"} 10⁸ V/m: dielectric breakdown risk; TLS saturation</td><td>Peak E-field at Josephson junction. High fields excite TLS defects in AlOx barrier and substrate, directly increasing T₁⁻¹.</td></tr><tr><td>20</td><td>HFSS-E-002</td><td>H-Field Distribution |H|</td><td>Medium</td><td>|H| {"<"} 10³ A/m at SC surface; spatially uniform</td><td>{"<"} 500 A/m</td><td>{"<"} 5,000 A/m</td><td>{"<"} 500 A/m uniform: no vortex nucleation; surface current below pair-breaking</td><td>{">"} 10⁵ A/m: vortex trapping in SC film; each vortex adds ~1 kHz to κ</td><td>H-field concentration at superconductor surface. Hotspots exceed H_c1 locally, nucleating Abrikosov vortices that add loss.</td></tr><tr><td>21</td><td>HFSS-E-003</td><td>Interface Participation pᵢ</td><td>Critical</td><td>p_SA {"<"} 10⁻³; p_MS {"<"} 10⁻³</td><td>{"<"} 10⁻³</td><td>10⁻³ – 10⁻²</td><td>{"<"} 10⁻³: interface loss contribution {"<"} 1 kHz to T₁⁻¹; T₁ {">"} 1 ms achievable</td><td>{">"} 10⁻¹: interface dominates all loss channels; T₁ {"<"} 10 µs</td><td>Fraction of electric field energy at lossy interface. pᵢ × tan δᵢ × ω = loss rate. Dominant predictor of TLS-limited T₁.</td></tr><tr><td>22</td><td>HFSS-E-004</td><td>Surface Participation p_MA</td><td>Critical</td><td>p_MA (metal–air) {"<"} 10⁻⁴</td><td>{"<"} 10⁻⁴</td><td>10⁻⁴ – 10⁻³</td><td>{"<"} 10⁻⁴: native oxide TLS loss negligible; consistent with T₁ {">"} 500 µs</td><td>{">"} 10⁻²: native oxide (AlOx) TLS dominates decay; T₁ {"<"} 50 µs</td><td>Energy stored in metal–air (native oxide) interface. Key TLS loss channel in Al transmons; reduced by surface treatment.</td></tr><tr><td>23</td><td>HFSS-E-005</td><td>Bulk Participation p_bulk</td><td>High</td><td>p_bulk {"<"} 10⁻² for Si/sapphire substrates</td><td>{"<"} 5×10⁻³</td><td>10⁻² – 5×10⁻²</td><td>{"<"} 5×10⁻³: bulk dielectric loss {"<"} 1 kHz; substrate does not limit T₁</td><td>{">"} 0.1: bulk dominates; even ultra-pure Si limits T₁ {"<"} 100 µs</td><td>Energy fraction in bulk substrate dielectric. Multiplied by tan δ gives bulk T₁ contribution. Minimised by geometry.</td></tr><tr><td>24</td><td>HFSS-E-006</td><td>EPR (Junction EPR)</td><td>Critical</td><td>Junction EPR ≥ 0.9 for dominant mode</td><td>0.95 – 1.0</td><td>0.8 – 1.0</td><td>0.95–1.0: junction hosts {">"}95% inductive energy; anharmonicity and χ predicted accurately</td><td>{"<"} 0.5: junction energy shared with stray inductances; Hamiltonian extraction unreliable</td><td>Fraction of inductive energy in Josephson junction vs total. Drives EPR method for extracting dispersive shifts and decay rates.</td></tr><tr><td>25</td><td>HFSS-E-007</td><td>Radiation Q (Q_rad)</td><td>High</td><td>Q_rad ≥ 10⁶ for on-chip resonators (shielded)</td><td>{">"} 10⁶</td><td>{">"} 10⁵</td><td>{">"} 10⁶: radiation loss {"<"} 1 kHz; package design validated; Q_i not radiation-limited</td><td>{"<"} 10⁴: radiation loss dominates internal Q; chip must be redesigned</td><td>Quality factor limited by power radiated from chip. Poor shielding or slot-line modes radiate energy, reducing Q_i and T₁.</td></tr></tbody></table></div></details><details className="result-category" id="hfss-qubit-performance"><summary>Qubit Performance Metrics</summary><p className="category-note">HFSS-derived qubit checks for frequency, anharmonicity, energy scales, coherence, Purcell decay, and gate fidelity.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>VER ID</th><th>Parameter</th><th>Severity</th><th>Design Rule / Constraint</th><th>Ideal / Optimal Value</th><th>Acceptable Range</th><th>Good</th><th>Bad</th><th>Why It Matters</th></tr></thead><tbody><tr><td>26</td><td>HFSS-Q-001</td><td>Anharmonicity α</td><td>Critical</td><td>|α|/2π ≥ 150 MHz (|α| = |ω₁₂ − ω₀₁|)</td><td>−200 to −300 MHz</td><td>−100 to −500 MHz</td><td>|α| 200–300 MHz: DRAG gates {"<"} 30 ns with leakage {"<"} 0.01%; selective driving</td><td>|α| {"<"} 50 MHz: must slow gates to {">"} 200 ns; leakage to |2⟩ {">"} 1%</td><td>Frequency gap between 0→1 and 1→2 transitions. Must exceed pulse bandwidth for selective driving without leakage.</td></tr><tr><td>27</td><td>HFSS-Q-002</td><td>Qubit Frequency f_q</td><td>Critical</td><td>4.0 GHz ≤ f_q ≤ 6.0 GHz (transmon sweet spot)</td><td>4 – 6 GHz</td><td>3 – 8 GHz</td><td>4–6 GHz: kT/hf {"<"} 0.001 at 20 mK; standard microwave hardware</td><td>{"<"} 1 GHz: thermal population {">"} 1%; {">"} 10 GHz: substrate loss increases</td><td>Qubit transition frequency. Must be well above thermal energy (kT/h ≈ 400 MHz at 20 mK) and away from substrate TLS resonances.</td></tr><tr><td>28</td><td>HFSS-Q-003</td><td>Josephson Energy E_J</td><td>Critical</td><td>10 GHz ≤ E_J/h ≤ 40 GHz; E_J/E_C ≥ 50</td><td>15 – 30 GHz</td><td>5 – 60 GHz</td><td>15–30 GHz: f_q on target; charge insensitive; junction reproducible within ±5%</td><td>{"<"} 1 GHz: qubit below 2 GHz; thermally excited; E_J/E_C {"<"} 10: charge sensitive</td><td>Josephson tunneling energy sets qubit frequency and E_J/E_C ratio. Extracted in HFSS via junction inductance L_J = Φ₀²/E_J.</td></tr><tr><td>29</td><td>HFSS-Q-004</td><td>Charging Energy E_C</td><td>Critical</td><td>200 MHz ≤ E_C/h ≤ 350 MHz</td><td>200 – 350 MHz</td><td>100 – 500 MHz</td><td>200–350 MHz: anharmonicity ~−E_C; charge noise suppressed; qubit addressable</td><td>{"<"} 50 MHz: near-harmonic oscillator; {">"} 1000 MHz: Cooper-pair box regime</td><td>Single-electron charging energy set by shunt capacitance. E_C = e²/2C_Σ; defines anharmonicity and charge sensitivity.</td></tr><tr><td>30</td><td>HFSS-Q-005</td><td>Purcell Decay Rate γ_P</td><td>Critical</td><td>γ_P/2π {"<"} 1 kHz (without filter); {"<"} 100 Hz (with)</td><td>{"<"} 500 Hz</td><td>{"<"} 10 kHz</td><td>{"<"} 500 Hz: Purcell T₁ contribution {">"} 2 ms; does not limit qubit T₁ budget</td><td>{">"} 100 kHz: Purcell T₁ {"<"} 10 µs; qubit lifetime dominated by readout line</td><td>Qubit decay rate into transmission line via off-resonant resonator. γ_P = (g/Δ)²κ. Limits T₁ without Purcell filter.</td></tr><tr><td>31</td><td>HFSS-Q-006</td><td>Predicted T₁</td><td>Critical</td><td>T₁ {">"} 100 µs (planar 2D); {">"} 1 ms (3D cavity)</td><td>{">"} 500 µs (3D) / {">"} 100 µs (2D)</td><td>50 – 500 µs</td><td>{">"} 100 µs: supports {">"} 1000 gate depth within coherence envelope (10 ns gates)</td><td>{"<"} 10 µs: {"<"} 100 gates within T₁; fault-tolerant computation infeasible</td><td>Predicted energy relaxation time from HFSS loss model: 1/T₁ = Σ(pᵢ × ωᵢ × tan δᵢ) + γ_Purcell + γ_radiation.</td></tr><tr><td>32</td><td>HFSS-Q-007</td><td>Predicted T₂</td><td>Critical</td><td>T₂ {">"} 50 µs; ideally T₂ ≈ 2T₁ (pure dephasing limited)</td><td>{">"} 100 µs</td><td>20 – 300 µs</td><td>T₂ ≈ 2T₁: pure dephasing negligible; charge and flux noise well-suppressed</td><td>T₂ ≪ T₁: strong 1/f dephasing; substrate charge traps or flux noise dominant</td><td>Pure dephasing time. Gap between T₂ and 2T₁ quantifies 1/f noise from TLS charge noise and flux noise in junctions.</td></tr><tr><td>33</td><td>HFSS-Q-008</td><td>1Q Gate Fidelity F₁Q</td><td>Critical</td><td>F₁Q ≥ 99.9% (randomised benchmarking)</td><td>{">"} 99.9 %</td><td>99 – 99.99 %</td><td>{">"} 99.9%: below surface-code fault-tolerance threshold (~99.4%); QEC viable</td><td>{"<"} 99%: error rate exceeds fault-tolerance threshold; errors cascade in QEC</td><td>Single-qubit gate fidelity estimated from T₁, T₂, anharmonicity, and leakage. Must exceed fault-tolerant threshold ~99.5%.</td></tr><tr><td>34</td><td>HFSS-Q-009</td><td>2Q Gate Fidelity F₂Q</td><td>Critical</td><td>F₂Q ≥ 99.5% (CZ or iSWAP gate)</td><td>{">"} 99.5 %</td><td>98 – 99.9 %</td><td>{">"} 99.5%: viable for surface code with standard overhead; ZZ residual {"<"} 10 kHz</td><td>{"<"} 97%: excessive error rate; 2Q errors dominate total circuit error budget</td><td>Two-qubit gate fidelity. More sensitive to residual ZZ coupling, leakage, coupler calibration, and neighbouring qubit crosstalk.</td></tr></tbody></table></div></details><details className="result-category" id="hfss-crosstalk-isolation"><summary>Crosstalk {"&"} Isolation</summary><p className="category-note">Checks for always-on ZZ, neighbour isolation, leakage, package modes, and unintended electromagnetic coupling.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>VER ID</th><th>Parameter</th><th>Severity</th><th>Design Rule / Constraint</th><th>Ideal / Optimal Value</th><th>Acceptable Range</th><th>Good</th><th>Bad</th><th>Why It Matters</th></tr></thead><tbody><tr><td>35</td><td>HFSS-C-001</td><td>ZZ Coupling ζ (idle)</td><td>Critical</td><td>ζ_ZZ/2π {"<"} 10 kHz between non-coupled pairs (idle)</td><td>{"<"} 1 kHz</td><td>1 – 100 kHz</td><td>{"<"} 1 kHz: conditional phase {"<"} 0.01 rad in 10 µs; negligible idle ZZ error</td><td>{">"} 1 MHz: {">"} 1 rad conditional phase per µs; circuit depth severely limited</td><td>Always-on ZZ interaction from dispersive coupling. Even static ZZ causes phase errors that accumulate, limiting circuit depth.</td></tr><tr><td>36</td><td>HFSS-C-002</td><td>Nearest Neighbour Isolation</td><td>High</td><td>S_ij (nearest neighbour) ≤ −40 dB</td><td>{"<"} −40 dB</td><td>−30 to −50 dB</td><td>{"<"} −40 dB: driven rotation on neighbour qubit {"<"} 10⁻⁴ rad during single-qubit gate</td><td>{">"} −20 dB: significant driven rotation on neighbours; simultaneous single-qubit gates not independent</td><td>EM isolation between nearest-neighbour qubits. Insufficient isolation causes unwanted rotations during single-qubit gates.</td></tr><tr><td>37</td><td>HFSS-C-003</td><td>Next-Nearest Isolation</td><td>High</td><td>S_ij (next-nearest) ≤ −60 dB</td><td>{"<"} −60 dB</td><td>−50 to −70 dB</td><td>{"<"} −60 dB: long-range crosstalk {"<"} 10⁻⁶ rad; 2D grid operation fully independent</td><td>{">"} −40 dB: long-range coupling; frequency collisions compound with nearest-neighbour</td><td>Isolation beyond nearest neighbour. Critical for scalable multi-qubit processors; long-range EM leakage compounds errors.</td></tr><tr><td>38</td><td>HFSS-C-004</td><td>Leakage to |2⟩ (L₁)</td><td>Critical</td><td>L₁ {"<"} 0.01% per gate</td><td>{"<"} 0.01 %</td><td>0.01 – 0.1 %</td><td>{"<"} 0.01%: seepage outside qubit subspace negligible; DRAG pulse sufficient</td><td>{">"} 1%: leakage accumulates over circuit; error correction cannot track non-qubit states</td><td>Population leaked to |2⟩ non-computational state during gates. DRAG pulses mitigate but require sufficient anharmonicity.</td></tr><tr><td>39</td><td>HFSS-C-005</td><td>Spurious Mode Gap Δf_spur</td><td>High</td><td>Δf_spur ≥ 1 GHz from nearest spurious EM mode</td><td>{">"} 1 GHz gap</td><td>0.5 – 2 GHz gap</td><td>{">"} 1 GHz gap: no spurious mode within pulse bandwidth; gate calibration stable</td><td>{"<"} 0.2 GHz: mode within pulse bandwidth; state leakage and parametric drive of spurious modes</td><td>Frequency distance to nearest unintended EM mode. Modes within drive bandwidth cause state leakage and gate calibration drift.</td></tr><tr><td>40</td><td>HFSS-C-006</td><td>Package Mode Density</td><td>Medium</td><td>{"<"} 1 spurious package mode per GHz near qubit band</td><td>{"<"} 0.5 modes/GHz</td><td>{"<"} 5 modes/GHz</td><td>{"<"} 0.5/GHz: low probability of accidental hybridisation across 64-qubit chip</td><td>{">"} 10/GHz: dense mode spectrum; unavoidable hybridisation; package must be redesigned</td><td>Density of package/enclosure modes near qubit frequency. High density increases probability of accidental mode hybridisation.</td></tr></tbody></table></div></details><details className="result-category" id="hfss-thermal-loss"><summary>Thermal {"&"} Loss Parameters</summary><p className="category-note">Loss and thermal checks for dielectric, conductor, substrate, TLS, radiation, and package-related dissipation.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>VER ID</th><th>Parameter</th><th>Severity</th><th>Design Rule / Constraint</th><th>Ideal / Optimal Value</th><th>Acceptable Range</th><th>Good</th><th>Bad</th><th>Why It Matters</th></tr></thead><tbody><tr><td>41</td><td>HFSS-T-001</td><td>Dielectric Loss Tangent</td><td>Critical</td><td>tan δ {"<"} 10⁻⁶ (bulk substrate, Si or Al₂O₃)</td><td>{"<"} 10⁻⁶</td><td>10⁻⁷ – 10⁻⁵</td><td>{"<"} 10⁻⁶ (Si/sapphire): substrate contribution to T₁⁻¹ {"<"} 1 kHz; Q_i {">"} 10⁶</td><td>{">"} 10⁻³ (SiO₂, organics): dielectric loss dominates; T₁ {"<"} 1 µs; unacceptable</td><td>Bulk dielectric loss factor. Mandates high-resistivity Si or c-plane sapphire; amorphous oxides and organics are lossy.</td></tr><tr><td>42</td><td>HFSS-T-002</td><td>Surface Resistance Rs</td><td>High</td><td>Rs {"<"} 0.01 mΩ/□ at 10 mK for Al/Nb films</td><td>{"<"} 0.005 mΩ/□</td><td>0.001 – 0.1 mΩ/□</td><td>{"<"} 0.005 mΩ/□: residual resistance ratio high; vortex-free film; Q_i {">"} 10⁶</td><td>{">"} 1 mΩ/□: residual normal-metal loss or vortex contribution; Q_i {"<"} 10⁴</td><td>Microwave surface resistance of superconducting film. Residual Rs from vortices, normal-metal inclusions, or granularity limits Q_i.</td></tr><tr><td>43</td><td>HFSS-T-003</td><td>Dissipated Power P_sub</td><td>High</td><td>P_sub {"<"} 1 pW per qubit at design drive level</td><td>{"<"} 0.1 pW</td><td>0.1 – 100 pW</td><td>{"<"} 0.1 pW: quasiparticle generation rate negligible; T₁ not QP-limited</td><td>{">"} 1 nW: significant quasiparticle poisoning; T₁ collapses in µs timescale</td><td>Power deposited in substrate at millikelvin temperatures. Excess heating raises quasiparticle population, reducing T₁.</td></tr><tr><td>44</td><td>HFSS-T-004</td><td>Thermal NEP</td><td>Medium</td><td>NEP {"<"} 10⁻²⁰ W/√Hz at qubit frequency (20 mK)</td><td>{"<"} 10⁻²⁰ W/√Hz</td><td>10⁻²⁰ – 10⁻¹⁸</td><td>{"<"} 10⁻²⁰: thermal photon occupancy n_th {"<"} 10⁻³; qubit not spuriously excited</td><td>{">"} 10⁻¹⁶: near-classical noise floor; qubit excited multiple times per measurement cycle</td><td>Thermal noise equivalent power at qubit frequency. Drives spurious qubit excitation and sets fundamental measurement noise floor.</td></tr><tr><td>45</td><td>HFSS-T-005</td><td>TLS Loss Rate 1/T₁_TLS</td><td>Critical</td><td>1/T₁_TLS {"<"} 1 kHz (TLS contribution to decay)</td><td>{"<"} 0.5 kHz</td><td>0.5 – 10 kHz</td><td>{"<"} 0.5 kHz: TLS loss gives T₁_TLS {">"} 2 ms; not limiting coherence budget</td><td>{">"} 100 kHz: TLS dominates all other T₁ channels; requires redesign</td><td>Decay rate contribution from two-level system defects at metal–substrate, metal–air, and substrate–air interfaces.</td></tr><tr><td>46</td><td>HFSS-T-006</td><td>Conductor Loss α_c</td><td>Medium</td><td>α_c {"<"} 0.001 dB/m in SC resonator lines</td><td>{"<"} 0.0001 dB/m</td><td>0.0001 – 0.1 dB/m</td><td>{"<"} 0.0001 dB/m: ohmic loss negligible vs radiation and TLS loss in SC lines</td><td>{">"} 1 dB/m: conductor loss dominates; normal-metal sections or damaged SC film</td><td>Ohmic attenuation per unit length. Negligible in good superconductors far below Tc; dominant in normal metal or granular films.</td></tr><tr><td>47</td><td>HFSS-T-007</td><td>Package Radiation Loss 1/Q_rad</td><td>High</td><td>1/Q_rad {"<"} 10⁻⁷ (shielded package)</td><td>{"<"} 10⁻⁷</td><td>10⁻⁷ – 10⁻⁵</td><td>{"<"} 10⁻⁷: radiation Q {">"} 10⁷; package does not limit resonator or qubit Q</td><td>{">"} 10⁻⁴: radiation loss comparable to TLS loss; package seams/vias must be redesigned</td><td>Inverse radiation Q. Power fraction radiated from chip to environment via package seams, slots, and via fields.</td></tr></tbody></table></div></details><details className="result-category" id="hfss-convergence"><summary>Simulation Convergence Metrics</summary><p className="category-note">Numerical-quality checks for adaptive passes, mesh size, energy error, S-parameter convergence, and RAM use.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>VER ID</th><th>Parameter</th><th>Severity</th><th>Design Rule / Constraint</th><th>Ideal / Optimal Value</th><th>Acceptable Range</th><th>Good</th><th>Bad</th><th>Why It Matters</th></tr></thead><tbody><tr><td>48</td><td>HFSS-V-001</td><td>Delta S Convergence (ΔS)</td><td>Critical</td><td>ΔS {"<"} 0.002 (max |S-matrix change| between passes)</td><td>{"<"} 0.001</td><td>0.001 – 0.005</td><td>{"<"} 0.001: S-parameters converged to 3rd decimal place; Q-factor reliable to ±1%</td><td>{">"} 0.01: S-parameters still shifting; Q and coupling coefficients unreliable</td><td>Primary HFSS convergence criterion. Maximum change in S-parameter matrix between successive adaptive mesh refinement passes.</td></tr><tr><td>49</td><td>HFSS-V-002</td><td>Adaptive Pass Count</td><td>Medium</td><td>Converge within 6 – 15 adaptive passes</td><td>6 – 12 passes</td><td>6 – 25 passes</td><td>6–12 passes: efficient meshing; geometry well-suited to HFSS basis functions</td><td>{">"} 40 passes without convergence: poorly conditioned geometry or material error; abort and review</td><td>Number of mesh refinement iterations to reach ΔS criterion. Many passes indicates difficult geometry or incorrect material setup.</td></tr><tr><td>50</td><td>HFSS-V-003</td><td>Mesh Element Count</td><td>Medium</td><td>10,000 – 500,000 tetrahedra for typical qubit geometry</td><td>20k – 100k</td><td>10k – 500k</td><td>20k–100k: sufficient resolution for junction, pad, and resonator without excessive RAM</td><td>{">"} 1,000,000: direct solver RAM {">"} 256 GB; iterative solver with lower accuracy required</td><td>Total finite-element mesh size. Under-meshed → inaccurate fields; over-meshed → excessive compute cost and RAM.</td></tr><tr><td>51</td><td>HFSS-V-004</td><td>Energy Error Δε/ε</td><td>High</td><td>Energy error {"<"} 0.5% (relative stored energy error)</td><td>{"<"} 0.2 %</td><td>0.2 – 1 %</td><td>{"<"} 0.2%: field solution accurate; participation ratios and Q-factors reliable to {"<"} 1%</td><td>{">"} 2%: field solution inaccurate; EPR and loss calculations may be off by {">"} 10%</td><td>Relative error in total stored electromagnetic energy. Low energy error confirms accurate field solutions and Q-factor extraction.</td></tr><tr><td>52</td><td>HFSS-V-005</td><td>Simulation RAM Usage</td><td>Low</td><td>Peak RAM {"<"} 64 GB for standard qubit simulation</td><td>{"<"} 16 GB</td><td>16 – 64 GB</td><td>{"<"} 16 GB: fits standard workstation; direct solver; fastest and most accurate</td><td>{">"} 128 GB: requires HPC cluster; iterative solver fallback; convergence harder</td><td>RAM required for direct matrix solver. Excess forces iterative solver with lower accuracy and convergence risk.</td></tr></tbody></table></div></details>
        <details className="result-category" id="hfss-summary"><summary>HFSS Summary</summary>
        <p className="category-note">Use this as the quick overview of HFSS severity and category coverage.</p>
        <div className="parameter-table"><article><strong>25</strong><span>Critical</span></article><article><strong>15</strong><span>High</span></article><article><strong>10</strong><span>Medium</span></article><article><strong>2</strong><span>Low</span></article><article><strong>S-Parameters {"&"} RF Performance</strong><span>8 params · 3 critical</span></article><article><strong>Resonator {"&"} Cavity Parameters</strong><span>10 params · 5 critical</span></article><article><strong>Electromagnetic Field Outputs</strong><span>7 params · 3 critical</span></article><article><strong>Qubit Performance Metrics</strong><span>9 params · 9 critical</span></article><article><strong>Crosstalk {"&"} Isolation</strong><span>6 params · 2 critical</span></article><article><strong>Thermal {"&"} Loss Parameters</strong><span>7 params · 2 critical</span></article><article><strong>Simulation Convergence Metrics</strong><span>5 params · 1 critical</span></article></div>
        </details>
        </div></details></div>
    </>
  ),

  "q3d-results-analysis": ({ activeHash, onNavigate }) => (
    <>


        <p className="eyebrow">Results Analysis</p>

        <h2>Q3D Results Analysis</h2>

        <p className="section-lead">Q3D results explain the RLGC matrices, parasitic extraction values, and derived qubit metrics used after QClang creates superconducting chip geometry. This page has been updated from <strong>Q3D_Parameters_Corrected.pptx</strong>.</p>

        <div className="parameter-table"><article><strong>58 parameters</strong><span>The corrected PPT covers 58 Q3D output parameters.</span></article><article><strong>11 categories</strong><span>Each category is kept as a left-sidebar subtopic and a readable documentation table.</span></article><article><strong>Matrix foundation</strong><span>Resistance, inductance, conductance, and capacitance matrices are the base Q3D outputs.</span></article><article><strong>Design loop</strong><span>Use Q3D matrices to derive Ec, Ej, g, χ, ζ, and Purcell-rate checks for QClang layouts.</span></article></div>

        <div className="result-workbook grouped-results">

        <details className="result-sheet result-root"><summary><span>Q3D Corrected Parameters</span><small>58 corrected parameters grouped into 11 categories</small></summary><div className="result-nested">

        <details className="result-category" id="q3d-resistance-matrix"><summary>Resistance Matrix (R)</summary><p className="category-note">Resistance outputs describe DC and AC conductor losses. For superconducting layouts, use these values as fabrication and normal-state quality checks before low-temperature correction.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>1</td><td>DC Self-Resistance (R_ii)</td><td>R_ii / mΩ</td><td>DC sweep; sheet-resistance extraction</td><td>0.5 – 5 mΩ</td><td>{"<"} 1 mΩ</td><td>0.5 – 5 mΩ</td><td>{">"} 50 mΩ</td><td>Ohmic loss in qubit loop raises thermal noise floor and damps resonator Q factor</td><td>Al becomes superconducting at 4K → R→0; use RₙA as fabrication quality proxy</td></tr><tr><td>2</td><td>AC Self-Resistance at 5–6 GHz</td><td>R_ac / mΩ</td><td>HFSS/Q3D surface impedance model</td><td>2 – 20 mΩ</td><td>{"<"} 5 mΩ (superconducting at 4K)</td><td>5 – 20 mΩ</td><td>{">"} 100 mΩ</td><td>Values shown apply to normal-metal (room-temp) modeling; at cryogenic temp Al is superconducting (R→0). For non-SC segments or pre-cooldown checks, normal-metal losses degrade quality factor Q.</td><td>Skin effect sets frequency dependence: R_ac ∝ √f for bulk, ≈ R_dc for thin film {"<"} δ_s. These ranges are room-temperature references; at mK, SC Al gives R_ac → 0.</td></tr><tr><td>3</td><td>Mutual Resistance (R_ij)</td><td>R_ij / μΩ</td><td>Full R matrix extraction in Q3D</td><td>{"<"} 10 μΩ</td><td>≈ 0 (no shared current path)</td><td>{"<"} 50 μΩ</td><td>{">"} 500 μΩ</td><td>Shared resistive coupling between conductors indicates galvanic crosstalk</td><td>Non-zero R_ij reveals overlapping ground return paths; fix by isolating ground planes</td></tr><tr><td>4</td><td>Contact / Via Resistance</td><td>R_via / mΩ</td><td>TDR or DC 4-probe; Q3D via model</td><td>{"<"} 2 mΩ per via</td><td>{"<"} 1 mΩ (superconducting through-Si)</td><td>1 – 5 mΩ</td><td>{">"} 20 mΩ</td><td>Resistance at layer transitions limits Q in 3D integration and flip-chip assemblies</td><td>Critical for multi-chip modules; oxidation or poor metal contact is the main failure mode</td></tr><tr><td>5</td><td>Ground Plane Sheet Resistance</td><td>R_sh / mΩ/sq</td><td>4-probe measurement; Q3D bulk conductivity input</td><td>{"<"} 0.1 mΩ/sq (Al at 4K)</td><td>{"<"} 0.1 mΩ/sq</td><td>0.1 – 0.5 mΩ/sq</td><td>{">"} 5 mΩ/sq</td><td>High R_sh creates inductive ground return paths and shifts mode frequencies across the chip</td><td>Perforated ground planes for vortex pinning add ~5–10 pH/sq inductance per square</td></tr></tbody></table></div></details><details className="result-category" id="q3d-inductance-matrix"><summary>Inductance Matrix (L)</summary><p className="category-note">Inductance outputs connect geometry, kinetic inductance, mutual inductance, and Josephson energy used in qubit Hamiltonian extraction.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>6</td><td>Self-Inductance (L_ii)</td><td>L_ii / nH</td><td>Q3D magnetoquasistatic solver; pyEPR energy participation</td><td>0.5 – 5 nH</td><td>1 – 3 nH (target Ej/Ec ~ 50–80)</td><td>0.5 – 5 nH</td><td>{"<"} 0.1 or {">"} 20 nH</td><td>Sets Josephson energy Ej = Φ₀²/2L; directly determines qubit frequency f ≈ √(8EjEc)/h</td><td>L = L_geometric + L_kinetic; kinetic inductance is material-dependent (Al: ~0.1–1 pH/sq)</td></tr><tr><td>7</td><td>Mutual Inductance (M_ij)</td><td>M_ij / pH</td><td>Q3D off-diagonal L matrix extraction</td><td>1 – 50 pH</td><td>{"<"} 5 pH (idle qubits)</td><td>5 – 50 pH</td><td>{">"} 500 pH</td><td>Magnetically coupled flux between loops drives parasitic ZZ interaction and inductive crosstalk</td><td>Intentional M_ij used in flux-tunable couplers; unintentional M_ij sets residual ZZ floor</td></tr><tr><td>8</td><td>Geometric Inductance</td><td>L_geo / pH/μm</td><td>Q3D partial inductance extraction (PEEC)</td><td>0.3 – 0.8 pH/μm</td><td>{"<"} 0.5 pH/μm (wide ground traces)</td><td>0.5 – 1 pH/μm</td><td>{">"} 2 pH/μm</td><td>Inductance from current path geometry adds to kinetic inductance to set total L and mode freq</td><td>Slot cuts in ground plane drastically increase L_geo; continuous ground plane is preferred</td></tr><tr><td>9</td><td>Kinetic Inductance (L_k)</td><td>L_k / pH/sq</td><td>Microwave resonator fitting; L_k = ℏ²/(π Δ e² n_s t)</td><td>1–2 pH/sq (Al, 100–200 nm); 30–200 pH/sq (NbTiN)</td><td>{"<"} 2 pH/sq (standard Al transmon, 100–200 nm film)</td><td>1 – 10 pH/sq</td><td>{">"} 100 pH/sq (non-KI devices)</td><td>Inertia of Cooper pairs; provides non-linearity in KI qubits; adds to geometric L in CPW</td><td>High-L_k materials (NbTiN, TiN, NbN) used deliberately for kinetic inductance qubit designs</td></tr><tr><td>10</td><td>Josephson Inductance (L_J)</td><td>L_J / nH</td><td>Derived: L_J = Φ₀/(2π I_c) = Φ₀²/(2Ej); I_c from RₙA measurement</td><td>5 – 15 nH</td><td>8 – 12 nH (Ej/Ec ~ 50–80)</td><td>5 – 20 nH</td><td>{"<"} 1 or {">"} 50 nH</td><td>Non-linear inductance of JJ; L_J(φ) = L_J0/cos(φ) provides essential quantum non-linearity</td><td>L_J is the ONLY non-linear element; its ratio to shunting capacitance sets anharmonicity α</td></tr></tbody></table></div></details><details className="result-category" id="q3d-conductance-matrix"><summary>Conductance Matrix (G)</summary><p className="category-note">Conductance outputs describe leakage paths, dielectric loss, and shunt conductance that can reduce resonator Q and qubit coherence.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>11</td><td>Self-Conductance (G_ii)</td><td>G_ii / nS</td><td>Q3D DC conductance solve</td><td>{"<"} 0.1 nS</td><td>{"<"} 0.1 nS (high-R substrate)</td><td>0.1 – 1 nS</td><td>{">"} 10 nS</td><td>Leakage current to ground through substrate limits resonator quality factor directly</td><td>G_ii = 1/R_leak; appears as parallel resistance Q = ω_r C_r / G in resonator model</td></tr><tr><td>12</td><td>Substrate Bulk Conductance</td><td>G_bulk / nS</td><td>Resistivity measurement + Q3D G matrix</td><td>{"<"} 0.01 nS</td><td>{"<"} 0.01 nS ({">"} 10 kΩcm Si at 4K)</td><td>0.01 – 0.5 nS</td><td>{">"} 5 nS</td><td>Low-resistivity Si drastically degrades resonator Q; bulk conductance is the dominant channel</td><td>Use high-resistivity Si ({">"} 10 kΩcm) or sapphire; resistivity increases {">"}100× when cooled to 4K (carrier freeze-out; magnitude is strongly doping-dependent)</td></tr><tr><td>13</td><td>Surface / Interface Conductance</td><td>G_surf / nS/μm</td><td>Surface participation ratio + loss tangent fitting</td><td>{"<"} 0.001 nS/μm</td><td>{"<"} 0.001 nS/μm (clean passivated)</td><td>0.001 – 0.05 nS/μm</td><td>{">"} 0.1 nS/μm</td><td>Conductance along metal-air or metal-substrate interfaces is a major T₁ limitation via TLS</td><td>Adsorbed water and organic residues increase G_surf; HF dip and N₂ purge before cooldown helps</td></tr><tr><td>14</td><td>Mutual Conductance (G_ij)</td><td>G_ij / pS</td><td>Q3D off-diagonal G matrix extraction</td><td>{"<"} 1 pS</td><td>{"<"} 1 pS (isolated conductors)</td><td>1 – 50 pS</td><td>{">"} 500 pS</td><td>Leakage coupling between signal conductors via substrate surface conduction channels</td><td>Non-zero G_ij in presence of surface water or conductive substrate; fixed by surface clean or guard rings</td></tr></tbody></table></div></details><details className="result-category" id="q3d-capacitance-matrix"><summary>Capacitance Matrix (C)</summary><p className="category-note">Capacitance outputs are the main Q3D bridge into transmon energy, coupling, detuning, and readout design.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>15</td><td>Qubit Self-Capacitance (C_Σ)</td><td>C_Σ / fF</td><td>Q3D electrostatic solve; Maxwell capacitance matrix</td><td>60 – 100 fF</td><td>60 – 100 fF (transmon shunting)</td><td>40 – 200 fF</td><td>{"<"} 10 fF or {">"} 500 fF</td><td>Sets charging energy Ec = e²/2C_Σ; large C_Σ → transmon regime → exponentially reduced charge noise</td><td>C_Σ = Σ|C_ij| from Maxwell matrix; target Ej/Ec = 50–80 for optimal transmon performance</td></tr><tr><td>16</td><td>Readout Resonator Capacitance (C_r)</td><td>C_r / fF</td><td>Q3D capacitance matrix + HFSS eigenmode simulation</td><td>200 – 500 fF</td><td>200 – 500 fF (λ/4 CPW)</td><td>100 – 600 fF</td><td>{"<"} 50 or {">"} 1 pF</td><td>Resonator mode capacitance sets frequency: ω_r = 1/√(L_r C_r); must target 6.5–8 GHz window</td><td>Combined with Q_ext sets readout bandwidth κ = ω_r/Q_ext; trade-off between speed and SNR</td></tr><tr><td>17</td><td>Qubit–Resonator Coupling Cap (C_g)</td><td>C_g / fF</td><td>Q3D Maxwell matrix off-diagonal C_12 between qubit island and resonator</td><td>1 – 10 fF</td><td>1 – 10 fF (dispersive limit)</td><td>0.5 – 15 fF</td><td>{"<"} 0.1 or {">"} 50 fF</td><td>Sets coupling g = C_g/(2C_Σ)·√(ω_q ω_r/L_r C_r); must stay dispersive (g ≪ qubit–resonator detuning)</td><td>g/2π target 50–150 MHz; too large → strong coupling regime; Purcell decay ∝ (g/Δ)² × κ</td></tr><tr><td>18</td><td>Qubit–Qubit Coupling Cap (C_J)</td><td>C_J / fF</td><td>Q3D full capacitance matrix between qubit islands</td><td>0.5 – 5 fF</td><td>0.5 – 5 fF (tunable coupler)</td><td>0.2 – 10 fF</td><td>{"<"} 0.05 or {">"} 30 fF</td><td>Drives direct transverse coupling J; residual C_J causes always-on ZZ unless tunable coupler used</td><td>Modern heavy-hex lattice uses tunable couplers to cancel residual ZZ to {"<"} 10 kHz</td></tr><tr><td>19</td><td>Pad-to-Ground Parasitic Cap</td><td>C_pad / fF</td><td>Q3D with ground plane mesh</td><td>{"<"} 5 fF per pad</td><td>{"<"} 5 fF (small footprint)</td><td>1 – 20 fF</td><td>{">"} 50 fF</td><td>Unintended pad-to-ground capacitance shifts qubit frequency from design target</td><td>Each 1 fF of parasitic shifts f_qubit by ~10–30 MHz; critical to include in Hamiltonian model</td></tr><tr><td>20</td><td>Trace Mutual Capacitance (C_ij)</td><td>C_ij / fF</td><td>Q3D electrostatic solve off-diagonal extraction</td><td>{"<"} 1 fF (separated lines)</td><td>{"<"} 1 fF</td><td>1 – 5 fF</td><td>{">"} 20 fF</td><td>Capacitive coupling between control lines causes microwave crosstalk in drive and readout paths</td><td>Overlapping traces on adjacent layers is the primary source; add ground shield layer to suppress</td></tr></tbody></table></div></details><details className="result-category" id="q3d-parasitic-resistance"><summary>Parasitic Resistance</summary><p className="category-note">Parasitic resistance checks identify unwanted ohmic paths, contacts, vias, and interconnect losses before superconducting operation.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>21</td><td>Series JJ Parasitic Resistance</td><td>R_ser / Ω</td><td>RF impedance spectroscopy; Q3D lead model</td><td>{"<"} 0.01 Ω</td><td>{"<"} 0.01 Ω (clean superconducting)</td><td>0.01 – 0.1 Ω</td><td>{">"} 1 Ω</td><td>Quasiparticle conductance in JJ leads causes T₁ decay via Ohmic dissipation in qubit circuit</td><td>Quasiparticle poisoning (stray radiation) transiently raises R_ser; shielding critical at mK</td></tr><tr><td>22</td><td>Shunt Parasitic Resistance (R_p)</td><td>R_p / kΩ</td><td>Q3D G matrix → R_p = 1/G_ii</td><td>{">"} 1 MΩ</td><td>{">"} 1 MΩ (effectively open)</td><td>100 kΩ – 1 MΩ</td><td>{"<"} 10 kΩ</td><td>Parallel leakage path across qubit capacitor reduces effective Q = R_p·√(C/L)</td><td>Substrate residues from lithography are the most common cause; requires thorough O₂ plasma clean</td></tr><tr><td>23</td><td>Wirebond / Bump Resistance</td><td>R_wb / mΩ</td><td>4-probe TDR; Q3D bond-wire cylinder model</td><td>{"<"} 5 mΩ per bond</td><td>{"<"} 5 mΩ</td><td>2 – 20 mΩ</td><td>{">"} 100 mΩ</td><td>Parasitic series resistance contributes to insertion loss and thermal noise at 4K</td><td>Au–Au thermo-compression bonds have lower and more repeatable R_wb than Al wedge bonds</td></tr><tr><td>24</td><td>Metal Interface Contact Resistance</td><td>R_c / mΩ</td><td>TLM structure measurement; Q3D metal stack</td><td>{"<"} 1 mΩ (clean Al–Al)</td><td>{"<"} 1 mΩ</td><td>1 – 10 mΩ</td><td>{">"} 50 mΩ</td><td>Interface resistance at Al–Au and Al–Nb transitions is critical in 3D integration</td><td>Native Al₂O₃ (2–4 nm) must be removed by Ar ion milling before deposition for low R_c</td></tr></tbody></table></div></details><details className="result-category" id="q3d-parasitic-inductance"><summary>Parasitic Inductance</summary><p className="category-note">Parasitic inductance checks identify wirebond, via, loop, and package effects that shift mode frequencies and add crosstalk.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>25</td><td>Wirebond / Bump Inductance</td><td>L_wb / nH</td><td>Q3D wire cylinder model; HFSS S-parameter fitting</td><td>0.5 – 2 nH per bond</td><td>{"<"} 1 nH</td><td>0.3 – 3 nH</td><td>{">"} 5 nH</td><td>Series inductance in signal path creates impedance discontinuity; resonates near operating freq</td><td>Flip-chip indium bumps reduce L_wb to ~0.1 nH vs 1–2 nH for wirebonds; key for 3D scaling</td></tr><tr><td>26</td><td>Control Line Lead Inductance</td><td>L_lead / pH</td><td>Q3D PEEC; partial inductance extraction</td><td>{"<"} 100 pH</td><td>{"<"} 100 pH (short on-chip)</td><td>50 – 500 pH</td><td>{">"} 2 nH</td><td>Lead inductance in flux/charge bias lines causes AC flux errors and qubit frequency shifts</td><td>Long coax from room-temperature electronics adds 1–10 nH; de-embed by careful calibration</td></tr><tr><td>27</td><td>Ground Plane Slot Inductance</td><td>L_slot / pH/sq</td><td>Q3D mesh simulation of ground plane geometry</td><td>{"<"} 1 pH/sq</td><td>{"<"} 1 pH/sq (continuous ground)</td><td>1 – 5 pH/sq</td><td>{">"} 20 pH/sq</td><td>Inductance from ground return path gaps distorts mode frequencies across the chip</td><td>Vortex-pinning holes (diameter ~ 1 μm, pitch ~ 2 μm) add ~5–10 pH/sq but are necessary at B {">"} 0</td></tr><tr><td>28</td><td>Package / Board Parasitic Inductance</td><td>L_pkg / nH</td><td>HFSS full package model + Q3D trace extraction</td><td>{"<"} 0.5 nH (SMA launch)</td><td>{"<"} 0.5 nH</td><td>0.5 – 2 nH</td><td>{">"} 5 nH</td><td>Package inductance shifts resonator input impedance; must be de-embedded from measurement</td><td>Surface-mount SMP connectors ({"<"} 0.3 nH) preferred over SMA (~0.5–1 nH) for cryo packages</td></tr></tbody></table></div></details><details className="result-category" id="q3d-parasitic-capacitance"><summary>Parasitic Capacitance</summary><p className="category-note">Parasitic capacitance checks reveal unwanted coupling paths, loading, frequency shifts, and edge-field concentration.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>29</td><td>Trace-to-Ground Parasitic Cap</td><td>C_trace / fF/μm</td><td>Q3D electrostatic solve per-unit-length</td><td>0.1 – 0.4 fF/μm</td><td>0.1 – 0.4 fF/μm (50 Ω CPW)</td><td>0.1 – 1 fF/μm</td><td>{">"} 3 fF/μm</td><td>Distributed capacitance sets CPW characteristic impedance Z₀ = √(L/C); target 50 Ω</td><td>C' depends on gap width and substrate thickness; narrowing the gap increases C' (lowers Z₀)</td></tr><tr><td>30</td><td>Pad-to-Substrate Parasitic Cap</td><td>C_sub / fF</td><td>Q3D C matrix with substrate dielectric stack</td><td>{"<"} 10 fF</td><td>{"<"} 10 fF (small contact pads)</td><td>5 – 30 fF</td><td>{">"} 100 fF</td><td>Substrate capacitance creates parasitic shunt path reducing resonator Q and shifting qubit freq</td><td>Thinning substrate from 500 μm to 200 μm reduces C_sub by ~2.5×; used in IBM 3D chip stacks</td></tr><tr><td>31</td><td>Inter-Layer Cap (3D integration)</td><td>C_layer / fF</td><td>Q3D 3D stack model; bump height geometry sweep</td><td>{"<"} 5 fF per crossing</td><td>{"<"} 5 fF (flip-chip bump)</td><td>1 – 20 fF</td><td>{">"} 50 fF</td><td>Capacitance between chip layers through indium/SnAg bumps must be included in Hamiltonian</td><td>Bump height variation (σ ~ 1–2 μm) causes C_layer spread of ~0.5–1 fF; matters at scale</td></tr><tr><td>32</td><td>Fringe Capacitance (gap edges)</td><td>C_fringe / fF/μm</td><td>Q3D conformal mesh at conductor edges</td><td>0.02 – 0.1 fF/μm</td><td>0.02 – 0.1 fF/μm (5–20 μm gap)</td><td>0.05 – 0.5 fF/μm</td><td>{">"} 1 fF/μm</td><td>Fringe fields at edges add to intended coupling capacitance; must be in C_g design model</td><td>~30–50% of C_g in typical transmon designs comes from fringe; underestimating shifts f by 50+ MHz</td></tr><tr><td>33</td><td>Wirebond Pad Parasitic Cap</td><td>C_pad_wb / fF</td><td>Q3D parallel-plate + fringe approximation; or analytical C = ε₀ εr A/d</td><td>{"<"} 50 fF (100×100 μm Al pad)</td><td>{"<"} 50 fF</td><td>20 – 150 fF</td><td>{">"} 300 fF</td><td>Bond-pad capacitance loads the signal line; degrades bandwidth and causes reflection at bond</td><td>Reducing pad size from 150×150 μm to 80×80 μm cuts C_pad by ~2.5× with no bond yield penalty</td></tr></tbody></table></div></details><details className="result-category" id="q3d-electromagnetic-coupling"><summary>Electromagnetic Coupling</summary><p className="category-note">Coupling outputs connect Q3D extraction to qubit-qubit, qubit-resonator, and package-mode interactions.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>34</td><td>External Quality Factor (Q_ext)</td><td>Q_ext</td><td>HFSS eigenmode + Q3D coupling capacitance extraction</td><td>10³ – 10⁵</td><td>5×10³ – 2×10⁴ (dispersive readout)</td><td>10³ – 10⁵</td><td>{"<"} 500 or {">"} 10⁶</td><td>Sets readout bandwidth κ = ω_r/Q_ext and Purcell loss rate; undercoupled → slow; overcoupled → Purcell</td><td>Purcell limit: T₁_Purcell = Q_ext/ω_r × (Δ/g)²; Purcell filter relaxes this trade-off</td></tr><tr><td>35</td><td>Internal Quality Factor (Q_int)</td><td>Q_int</td><td>VNA transmission measurement; HFSS loss tangent input</td><td>{">"} 10⁶ (planar Al at 4K)</td><td>{">"} 10⁶</td><td>10⁵ – 10⁶</td><td>{"<"} 10⁴</td><td>Intrinsic resonator loss from TLS, dielectric, radiation; directly sets T₁ floor via Purcell</td><td>Q_int {">"} 10⁶ requires: HR-Si or sapphire substrate, clean metal deposition, minimal surface TLS</td></tr><tr><td>36</td><td>Loaded Quality Factor (Q_L)</td><td>Q_L</td><td>1/Q_L = 1/Q_int + 1/Q_ext; VNA S21 Lorentzian fit</td><td>10³ – 10⁴</td><td>10³ – 10⁴ (balanced readout)</td><td>500 – 2×10⁴</td><td>{"<"} 200 or {">"} 10⁵</td><td>Determines resonator 3 dB bandwidth; BW = f_r/Q_L sets speed vs SNR tradeoff for readout</td><td>In practice Q_L ≈ Q_ext when Q_int {">"}{">"} Q_ext (under-coupled limit is common design choice)</td></tr><tr><td>37</td><td>CPW Characteristic Impedance (Z₀)</td><td>Z₀ / Ω</td><td>Q3D RLGC → Z₀ = √(L'/C'); verified by HFSS S11 calibration</td><td>50 Ω ± 1 Ω</td><td>50 Ω ± 1 Ω</td><td>45 – 55 Ω</td><td>{"<"} 30 or {">"} 80 Ω</td><td>Impedance mismatch causes reflections degrading signal integrity; Z₀ controlled by trace/gap ratio</td><td>On 500 μm Si: 10 μm trace / 6 μm gap → Z₀ ≈ 50 Ω; wider trace → lower Z₀</td></tr><tr><td>38</td><td>Effective Permittivity (ε_eff)</td><td>ε_eff</td><td>Q3D electrostatic fill factor calculation; HFSS eigenmode</td><td>6.0 – 6.5 (CPW on Si)</td><td>6.0 – 6.5</td><td>5.5 – 7.0</td><td>{"<"} 4 or {">"} 9</td><td>Sets propagation velocity v_ph = c/√ε_eff and resonator physical length for target frequency</td><td>ε_eff depends on substrate filling fraction; ε_eff ≈ (1 + εr)/2 for CPW in air on substrate</td></tr><tr><td>39</td><td>Coupling Coefficient k²</td><td>k² / ×10⁻³</td><td>Q3D capacitance ratio k² = C_g² / (C_1 × C_2)</td><td>1 – 10 ×10⁻³</td><td>1 – 10 ×10⁻³</td><td>0.5 – 20 ×10⁻³</td><td>{"<"} 0.1 or {">"} 50 ×10⁻³</td><td>Power transfer efficiency between resonator and feedline; determines Q_ext directly</td><td>k² ∝ gap width at coupling capacitor; etch depth variation of 0.1 μm → δk²/k² ~ 5%</td></tr></tbody></table></div></details><details className="result-category" id="q3d-substrate-dielectric-loss"><summary>Substrate {"&"} Dielectric Loss</summary><p className="category-note">Substrate and dielectric-loss outputs explain how material selection and surface participation affect T1.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>40</td><td>Substrate Bulk Loss Tangent</td><td>tan δ_bulk</td><td>Q3D dielectric loss tangent input; resonator Q fitting vs power</td><td>{"<"} 10⁻⁶ (HR-Si, 4K)</td><td>{"<"} 10⁻⁶</td><td>10⁻⁶ – 10⁻⁵</td><td>{">"} 10⁻⁴</td><td>Bulk dielectric loss sets floor on 1/Q_int from substrate volume; sapphire {"<"} 5×10⁻⁷</td><td>tan δ improves by 10–100× on cooling from 300K to 4K due to reduced phonon and TLS population</td></tr><tr><td>41</td><td>Metal-Air Interface Loss (tan δ_MA)</td><td>tan δ_MA</td><td>Surface participation ratio (SPR) from Q3D E-field + measured Q factor</td><td>~10⁻³</td><td>{"<"} 10⁻³ (passivated Al₂O₃)</td><td>10⁻³ – 5×10⁻³</td><td>{">"} 10⁻²</td><td>TLS loss at metal-air interface is the dominant T₁ source in planar transmon designs</td><td>Etching native oxide before Al deposition reduces tan δ_MA by up to 10×; HF vapor clean</td></tr><tr><td>42</td><td>Substrate-Air Interface Loss (tan δ_SA)</td><td>tan δ_SA</td><td>SPR analysis from Q3D E-field distribution</td><td>~5×10⁻⁴</td><td>{"<"} 5×10⁻⁴ (HF-etched Si)</td><td>5×10⁻⁴ – 5×10⁻³</td><td>{">"} 10⁻²</td><td>TLS at substrate exposed surface; addressed by passivation, UV ozone clean, or dry etching</td><td>Hydrogen-passivated Si surface (HF dip) shows 5× lower tan δ_SA vs untreated Si</td></tr><tr><td>43</td><td>Metal-Substrate Interface Loss (tan δ_MS)</td><td>tan δ_MS</td><td>EELS/TEM interface composition + Q3D SPR calculation</td><td>~5×10⁻³</td><td>{"<"} 5×10⁻³</td><td>5×10⁻³ – 10⁻²</td><td>{">"} 5×10⁻²</td><td>TLS at Al–Si or Nb–Si interface; reduced by HF dip substrate prep before metal deposition</td><td>Amorphous interfacial SiOx layer of 1–2 nm is the primary TLS host; substrate HF clean removes it</td></tr><tr><td>44</td><td>Surface Participation Ratio (SPR)</td><td>p_MA / ppm</td><td>Q3D E-field energy integral on metal-air interface: p = ∫_MA ε|E|²dV / ∫_all ε|E|²dV</td><td>5 – 50 ppm</td><td>{"<"} 5 ppm</td><td>5 – 50 ppm</td><td>{">"} 200 ppm</td><td>p × tan δ contributes directly to 1/Q; minimise by thick metal, wider gap, no sharp corners. For planar transmons, p_MA can reach 100–1000 ppm without geometry optimisation.</td><td>1/Q_TLS = Σ p_i × tan δ_i; SPR is the design lever; tan δ is the material lever. {"<"}5 ppm ideal is achievable in optimised 3D cavity or large-gap planar designs; planar CPW without optimisation may be 100–1000 ppm.</td></tr></tbody></table></div></details><details className="result-category" id="q3d-skin-effect-frequency"><summary>Skin Effect {"&"} Frequency-Dependent</summary><p className="category-note">Frequency-dependent checks show how conductor behavior changes with microwave frequency, penetration depth, and kinetic inductance.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>45</td><td>Skin Depth at 5 GHz</td><td>δ_s / μm</td><td>δ_s = √(2ρ/ωμ); Q3D skin-effect mode at frequency</td><td>0.9 μm (Al at RT)</td><td>0.5 – 2 μm</td><td>0.5 – 3 μm</td><td>{">"} 5 μm (film {"<"} δ_s)</td><td>If metal thickness {"<"} δ_s entire cross-section carries current and R_ac ≈ R_dc (good for thin films)</td><td>Al at 4K is superconducting so δ_s concept replaced by London penetration depth λ_L: bulk Al ~16–55 nm; thin-film Al (50–200 nm film) typically 60–163 nm — increases as film thickness decreases</td></tr><tr><td>46</td><td>AC/DC Resistance Ratio</td><td>R_ac/R_dc</td><td>Q3D frequency sweep; skin-effect solver comparison at DC vs 5 GHz</td><td>1.0 – 1.05 (thin film)</td><td>≈ 1.0 (thin film {"<"} δ_s)</td><td>1.0 – 2.0</td><td>{">"} 5</td><td>Thin-film qubits (t ~ 100–200 nm) operate below skin-depth limit so R_ac ≈ R_dc</td><td>Normal-metal (Cu, Au) transmission lines show R_ac/R_dc ~ 3–5 at 5 GHz; use SC lines at mK</td></tr><tr><td>47</td><td>Propagation Constant (γ)</td><td>α / dB/m, β / rad/m</td><td>Q3D RLGC → γ = √((R+jωL)(G+jωC))</td><td>α {"<"} 0.1 dB/m (SC CPW)</td><td>α {"<"} 0.1 dB/m; β = ω√(L'C')</td><td>α 0.1 – 1 dB/m</td><td>α {">"} 10 dB/m</td><td>α sets transmission line attenuation; β sets phase velocity; both from RLGC per unit length</td><td>For long interconnects ({">"} 10 mm) even 0.1 dB/m causes measurable signal loss; use SC Al/Nb</td></tr><tr><td>48</td><td>Phase Velocity (v_ph)</td><td>v_ph / ×10⁸ m/s</td><td>Q3D RLGC → v_ph = ω/β = 1/√(L'C')</td><td>1.2 – 1.4 ×10⁸ m/s</td><td>1.2 – 1.4 ×10⁸ m/s (CPW on Si)</td><td>1.0 – 1.6 ×10⁸ m/s</td><td>{"<"} 0.8 or {">"} 2.0</td><td>Sets resonator physical length for target frequency; L = v_ph/(4f_r) for λ/4 resonator</td><td>v_ph = c/√ε_eff; on Si ε_eff ≈ 6.3 → v_ph ≈ 1.19×10⁸ m/s; λ/4 at 7 GHz ≈ 4.25 mm</td></tr><tr><td>49</td><td>Per-Unit-Length Resistance (R')</td><td>R' / mΩ/mm</td><td>Q3D frequency-dependent R matrix; RLGC R' vs frequency</td><td>{"<"} 0.1 mΩ/mm (SC Al)</td><td>{"<"} 0.1 mΩ/mm</td><td>0.1 – 2 mΩ/mm</td><td>{">"} 10 mΩ/mm</td><td>Distributed series resistance determines attenuation α ≈ R'/(2Z₀); critical for long interconnects</td><td>At 4K Al becomes superconducting: R' → 0 below T_c; use R' to identify non-SC regions</td></tr><tr><td>50</td><td>Per-Unit-Length Inductance (L')</td><td>L' / nH/mm</td><td>Q3D RLGC magnetostatic solve</td><td>0.3 – 0.5 nH/mm</td><td>0.3 – 0.5 nH/mm (50 Ω CPW on Si)</td><td>0.2 – 0.8 nH/mm</td><td>{"<"} 0.1 or {">"} 2 nH/mm</td><td>Distributed inductance per mm; with C' sets Z₀ = √(L'/C') and v_ph = 1/√(L'C')</td><td>L' includes both geometric and kinetic contributions; L'_kinetic small for Al (~0.01–0.05 nH/mm)</td></tr><tr><td>51</td><td>Per-Unit-Length Capacitance (C')</td><td>C' / pF/mm</td><td>Q3D RLGC electrostatic solve</td><td>0.1 – 0.2 pF/mm</td><td>0.1 – 0.2 pF/mm (50 Ω CPW on Si)</td><td>0.05 – 0.3 pF/mm</td><td>{"<"} 0.02 or {">"} 0.5 pF/mm</td><td>Distributed capacitance per mm; with L' sets Z₀ and ε_eff; narrow gap increases C' (lowers Z₀)</td><td>Check: Z₀ = √(L'/C') ≈ 50 Ω; v_ph = 1/√(L'×C') ≈ 1.2×10⁸ m/s; these are consistency checks</td></tr></tbody></table></div></details><details className="result-category" id="q3d-post-processing-derived"><summary>Post-Processing Derived Outputs</summary><p className="category-note">Derived outputs convert Q3D matrices into qubit design metrics such as Ec, Ej, g, chi, ZZ, and Purcell rate.</p><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Parameter</th><th>Symbol / Unit</th><th>Extraction Method</th><th>Typical Q3D Value</th><th>Ideal / Optimal</th><th>Good Range</th><th>Worst Case</th><th>Why It Matters</th><th>Key Design Note</th></tr></thead><tbody><tr><td>52</td><td>Charging Energy (Ec/h)</td><td>Ec / h·MHz</td><td>Ec = e²/(2C_Σ); C_Σ from Q3D Maxwell matrix</td><td>200 – 350 MHz</td><td>200 – 350 MHz (transmon optimum)</td><td>150 – 400 MHz</td><td>{"<"} 50 or {">"} 1 GHz</td><td>Sets charge sensitivity; Ej/Ec = 50–80 ideal for transmon; deviating worsens noise or anharmonicity</td><td>Ec/h = 200 MHz → C_Σ = 91 fF; exact C_Σ from Q3D is the critical input to Hamiltonian model</td></tr><tr><td>53</td><td>Josephson Energy (Ej/h)</td><td>Ej / h·GHz</td><td>Ej = Φ₀²/(2L_J) = Φ₀ I_c / 2π</td><td>10 – 30 GHz</td><td>10 – 30 GHz (Ej/Ec ~ 50–80)</td><td>5 – 50 GHz</td><td>{"<"} 2 or {">"} 100 GHz</td><td>With Ec determines qubit frequency f₀₁ ≈ √(8EjEc)/h − Ec/h and anharmonicity α = −Ec/h</td><td>Ej is tunable via flux in split-junction transmons; Ej/Ec spread across chip sets yield</td></tr><tr><td>54</td><td>Qubit–Resonator Coupling (g/2π)</td><td>g / 2π / MHz</td><td>g = C_g/(C_Σ) × √(ω_q ω_r)/2; C_g from Q3D off-diagonal</td><td>50 – 150 MHz</td><td>50 – 150 MHz (dispersive regime)</td><td>20 – 300 MHz</td><td>{"<"} 5 or {">"} 500 MHz</td><td>Vacuum Rabi coupling; in dispersive regime (g ≪ Δ) enables QND readout without qubit decay</td><td>g/Δ {"<"} 0.1 ensures dispersive limit; Purcell rate Γ_P = (g/Δ)² × κ scales as g²</td></tr><tr><td>55</td><td>Dispersive Shift (χ/2π)</td><td>χ / 2π / MHz</td><td>χ = g²/Δ × α/(Δ+α); Δ = ω_q − ω_r; all from Q3D + junction params</td><td>1 – 5 MHz</td><td>1 – 5 MHz</td><td>0.5 – 10 MHz</td><td>{"<"} 0.1 or {">"} 20 MHz</td><td>Qubit-state-dependent resonator shift; single-shot readout SNR ∝ χ/κ; larger χ → better fidelity</td><td>χ and Purcell rate trade off via g; Purcell filter allows larger g without excess Purcell loss</td></tr><tr><td>56</td><td>ZZ Coupling Rate (ζ/2π)</td><td>ζ / 2π / kHz</td><td>ζ = 2g²χ²/(Δ·α·(Δ+α)); derived from Q3D coupling capacitances</td><td>10 – 100 kHz</td><td>{"<"} 10 kHz</td><td>10 – 50 kHz</td><td>{">"} 200 kHz</td><td>Always-on conditional phase rate between qubits; leads to leakage in spectator qubits during gates</td><td>ZZ suppression is the central challenge of transmon scaling; tunable coupler can push ζ {"<"} 1 kHz</td></tr><tr><td>57</td><td>Anharmonicity (α/2π)</td><td>α / 2π / MHz</td><td>α = −Ec/h; Ec from Q3D C_Σ; or directly measured by two-tone spectroscopy</td><td>−200 to −300 MHz</td><td>−300 to −150 MHz</td><td>−350 to −100 MHz</td><td>|α|/2π {"<"} 50 MHz</td><td>Separates |0〉→|1〉 from |1〉→|2〉 transitions; sets minimum gate duration without leakage</td><td>Gate bandwidth BW {"<"} |α|/(2π) required to avoid leakage; |α| = 200 MHz → t_gate {">"} 5 ns</td></tr><tr><td>58</td><td>Purcell Decay Rate (Γ_P/2π)</td><td>Γ_P / 2π / kHz</td><td>Γ_P = (g/Δ)² × κ; κ = ω_r/Q_ext from Q3D; g from coupling cap</td><td>1 – 10 kHz</td><td>{"<"} 1 kHz (with Purcell filter)</td><td>1 – 10 kHz</td><td>{">"} 100 kHz</td><td>Resonator-induced qubit relaxation limiting T₁ even with long material T₁; mitigated by filter</td><td>Purcell filter (bandpass on resonator port) can reduce Γ_P by 10–100× without affecting readout</td></tr></tbody></table></div></details>

        <details className="result-category" id="q3d-key-takeaways"><summary>Key Takeaways</summary>

        <p className="category-note">Use these points as the practical Q3D learning summary for QClang users.</p>

        <div className="parameter-table"><article><strong>RLGC Matrices</strong><span>R, L, G, C matrices from Q3D are the primary inputs to circuit Hamiltonian models. Even small parasitic entries shift qubit frequencies by 10–100 MHz.</span></article><article><strong>Superconducting Regime</strong><span>At 4K, Al and Nb become superconducting → R→0, L_k dominates. Normal-metal values from Q3D need T-dependent correction.</span></article><article><strong>Surface Participation</strong><span>SPR × tan δ controls T₁. Design rule: minimise p_MA below 5 ppm via thick metal, wider CPW gaps, and clean interfaces.</span></article><article><strong>Derived Outputs</strong><span>Ec, Ej, g, χ, ζ, Γ_P are all computed from Q3D matrices. Iterating Q3D → Hamiltonian → optimise is the standard qubit design loop.</span></article></div>

        </details>

        </div></details></div>
    </>
  ),

  "epr-results-analysis": ({ activeHash, onNavigate }) => (
    <>




        <p className="eyebrow">Results Analysis</p>



        <h2>EPR / scQubits Analysis</h2>



        <p className="section-lead">EPR and scQubits results connect electromagnetic field energy to quantum-circuit behavior. Each workbook table is kept as a subcolumn under the main EPR analysis page.</p>



        <div className="parameter-table"><article><strong>Core EPR</strong><span>Participation ratios, zero-point fluctuations, and Hamiltonian extraction.</span></article><article><strong>Performance</strong><span>Qubit coherence, gate fidelity, resonator coupling, and loss channels.</span></article><article><strong>Simulation quality</strong><span>Convergence and accuracy checks that make EPR extraction reliable.</span></article><article><strong>Summary table</strong><span>A complete parameter reference for learners and future QClang result mapping.</span></article></div>



        <div className="result-workbook grouped-results">



        <details className="result-sheet result-root"><summary><span>EPR / scQubits Result Tables</span><small>Workbook sheets as learning subcolumns</small></summary><div className="result-nested">



        <details className="result-category" id="epr-overview-table"><summary>Overview</summary>



        <div className="result-table-wrap"><table className="data-table"><tbody><tr><td>Energy Participation Ratio (EPR) Analysis — Quantum Computing Output Parameters</td></tr><tr><td>Comprehensive reference of all EPR output parameters, optimal values, good/worst thresholds — compiled from research literature {"&"} theses</td></tr><tr><td>??  Sheet Guide</td></tr><tr><td>Sheet Name</td><td>Description</td></tr><tr><td>Overview</td><td>This sheet — legend, color guide, and sheet index</td></tr><tr><td>Core EPR Parameters</td><td>Primary outputs: energy participation ratios, loss rates, coupling strengths</td></tr><tr><td>Qubit Performance</td><td>Qubit quality metrics derived from EPR: T1, T2, anharmonicity, charge dispersion</td></tr><tr><td>Resonator {"&"} Coupling</td><td>Resonator frequency, Purcell decay, cross-Kerr, dispersive shift ?</td></tr><tr><td>Loss {"&"} Dissipation</td><td>Dielectric loss, TLS loss, radiation loss, seam loss, surface participation</td></tr><tr><td>Junction Parameters</td><td>Josephson junction inductance, participation ratio, ZPF voltage</td></tr><tr><td>Simulation Convergence</td><td>Mesh convergence, eigenmode accuracy, simulation quality indicators</td></tr><tr><td>Summary Table</td><td>Single consolidated master table across all categories</td></tr><tr><td>??  Color Legend</td></tr><tr><td>GOOD / OPTIMAL</td><td>Parameter is within the best-practice range for high-coherence devices</td></tr><tr><td>ACCEPTABLE</td><td>Parameter is functional but leaves room for improvement</td></tr><tr><td>POOR / WORST</td><td>Parameter degrades device performance; redesign recommended</td></tr><tr><td>HEADER / CATEGORY</td><td>Section or column header</td></tr><tr><td>DATA ROW</td><td>Standard data entry row</td></tr></tbody></table></div>



        </details>



        <details className="result-category" id="epr-core-parameters"><summary>Core EPR Parameters</summary>



        <p className="category-note">Core EPR Parameters ? Primary outputs of the EPR method: participation ratios, zero-point fluctuations, and mode hybridization metrics</p>



        <div className="result-nested inner">



        <details className="result-subcategory"><summary>A. Junction Energy Participation Ratios</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Junction Participation Ratio (transmon)</td><td>p_J</td><td>dimensionless</td><td>Fraction of total inductive energy stored in the Josephson junction for the qubit mode. Central quantity of EPR method.</td><td>0.90 – 0.99</td><td>0.80 – 0.99</td><td>0.50 – 0.79</td><td>{"<"} 0.30</td><td>High p_J maximises anharmonicity and qubit nonlinearity; low values reduce gate speed and anharmonicity.</td><td>Minev et al., Nature 2021; Solgun et al., PRApplied 2019</td></tr><tr><td>Junction Participation Ratio (readout mode)</td><td>p_J^res</td><td>dimensionless</td><td>Fraction of readout resonator mode energy in the junction. Should be minimised to reduce Purcell loss.</td><td>{"<"} 1×10?³</td><td>{"<"} 1×10?²</td><td>1×10?²–5×10?²</td><td>{">"} 0.10</td><td>Large p_J^res couples resonator decay channel to qubit, reducing T1 via Purcell effect.</td><td>Reed et al., PRL 2010; Houck et al., PRL 2008</td></tr><tr><td>Total Junction Participation (all modes)</td><td>Sp_J</td><td>dimensionless</td><td>Sum of participation ratios across all simulated eigenmodes; normalization check.</td><td>˜ 1.00 (±0.01)</td><td>0.98 – 1.02</td><td>0.95 – 1.04</td><td>{"<"} 0.90 or {">"} 1.10</td><td>Deviation from unity indicates missing modes, poor mesh, or incomplete boundary conditions.</td><td>Minev, PhD Thesis Yale 2018; Nigg et al., PRL 2012</td></tr><tr><td>Participation Ratio Asymmetry</td><td>?pJ</td><td>dimensionless</td><td>Difference in junction participation between two junctions in a split-junction (SQUID) qubit.</td><td>{"<"} 0.01</td><td>{"<"} 0.05</td><td>0.05–0.15</td><td>{">"} 0.20</td><td>Asymmetry leads to flux-noise sensitivity and reduced coherence in tunable qubits.</td><td>Koch et al., PRA 2007; Krantz et al., APR 2019</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>B. Zero-Point Fluctuation (ZPF) Quantities</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>ZPF Voltage across Junction</td><td>V_zpf</td><td>µV</td><td>RMS zero-point voltage fluctuation across the Josephson junction; sets qubit–photon coupling strength.</td><td>10 – 50 µV</td><td>5 – 100 µV</td><td>1 – 200 µV</td><td>{"<"} 0.5 µV or {">"} 500 µV</td><td>Too small ? weak anharmonicity; too large ? unwanted multiphoton transitions and leakage.</td><td>Minev et al., Nature 2021; Blais et al., RMP 2021</td></tr><tr><td>ZPF Current through Junction</td><td>I_zpf</td><td>nA</td><td>RMS zero-point current fluctuation; related to V_zpf via junction inductance.</td><td>1 – 10 nA</td><td>0.5 – 20 nA</td><td>0.1 – 50 nA</td><td>{"<"} 0.05 nA</td><td>Determines coupling to flux noise and magnetic environment; critical for flux qubits.</td><td>Orlando et al., PRB 1999; Mooij et al., Science 1999</td></tr><tr><td>ZPF Phase across Junction</td><td>f_zpf</td><td>rad</td><td>RMS zero-point phase fluctuation f_zpf = v(2eV_zpf/??_q). Governs perturbative expansion validity.</td><td>0.1 – 0.5 rad</td><td>0.05 – 0.6 rad</td><td>0.6 – 0.9 rad</td><td>{">"} 1.0 rad</td><td>Values {">"}1 rad invalidate the perturbative (dispersive) approximation used in EPR.</td><td>Minev Thesis 2018; Koch et al., PRA 2007</td></tr><tr><td>Hybridization Factor</td><td>?</td><td>dimensionless</td><td>Degree of mode hybridization between qubit and resonator; off-diagonal element in EPR Hamiltonian.</td><td>{"<"} 0.01 (well-dressed)</td><td>{"<"} 0.05</td><td>0.05 – 0.15</td><td>{">"} 0.20</td><td>Large hybridization mixes qubit and resonator, degrading single-mode approximation.</td><td>Solgun et al., PRApplied 2019; Blais et al., PRA 2004</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>C. Hamiltonian Parameters Extracted via EPR</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Qubit Frequency (extracted)</td><td>?_q/2p</td><td>GHz</td><td>Fundamental qubit transition frequency extracted from EPR eigenmode simulation.</td><td>4 – 6 GHz</td><td>3 – 8 GHz</td><td>1 – 3 or 8–12 GHz</td><td>{"<"} 1 GHz or {">"} 15 GHz</td><td>Outside optimal window: low freq ? thermal excitation; high freq ? limited coupling hardware.</td><td>Krantz et al., APR 2019; Arute et al., Nature 2019</td></tr><tr><td>Anharmonicity (EPR-derived)</td><td>a/2p</td><td>MHz</td><td>Qubit anharmonicity = ?_12 - ?_01; extracted via second-order EPR perturbation theory.</td><td>150 – 350 MHz</td><td>100 – 400 MHz</td><td>50 – 99 MHz</td><td>{"<"} 30 MHz</td><td>Insufficient anharmonicity causes leakage to |2? during gates; {">"}400 MHz may indicate charge noise sensitivity.</td><td>Koch et al., PRA 2007; Barends et al., PRL 2013</td></tr><tr><td>Kerr Self-Nonlinearity</td><td>K/2p</td><td>MHz</td><td>Effective Kerr coefficient (= anharmonicity for transmon); second-order EPR correction term.</td><td>150 – 300 MHz</td><td>100 – 400 MHz</td><td>50 – 99 MHz</td><td>{"<"} 20 MHz</td><td>Sets speed limit of single-qubit gates; related to DRAG pulse requirements.</td><td>Gambetta et al., PRA 2011; Motzoi et al., PRL 2009</td></tr><tr><td>Dispersive Shift ?/2p</td><td>?/2p</td><td>MHz</td><td>Qubit-state-dependent resonator frequency shift; critical for high-fidelity dispersive readout.</td><td>0.5 – 3 MHz</td><td>0.1 – 5 MHz</td><td>0.01 – 0.09 MHz</td><td>{"<"} 0.01 MHz or {">"} 10 MHz</td><td>Too small ? insufficient readout contrast; too large ? measurement-induced dephasing.</td><td>Blais et al., PRA 2004; Gambetta et al., PRA 2006</td></tr><tr><td>Cross-Kerr (qubit-qubit)</td><td>?_ij/2p</td><td>MHz</td><td>Always-on ZZ interaction between coupled qubits; parasitic term in multi-qubit chips.</td><td>{"<"} 0.01 MHz</td><td>{"<"} 0.10 MHz</td><td>0.10 – 0.50 MHz</td><td>{">"} 1.0 MHz</td><td>Large ZZ causes always-on entanglement errors; major source of two-qubit gate infidelity.</td><td>Kandala et al., Nature 2021; Ku et al., PRL 2020</td></tr></tbody></table></div></details>



        </div>



        </details>



        <details className="result-category" id="epr-qubit-performance"><summary>Qubit Performance</summary>



        <p className="category-note">Qubit Performance Metrics ? Coherence times, gate fidelities, and spectral properties derived from EPR loss analysis</p>



        <div className="result-nested inner">



        <details className="result-subcategory"><summary>A. Coherence Times</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Energy Relaxation Time T1</td><td>T1</td><td>µs</td><td>Time for qubit to decay from |1? to |0?; bounded by all loss channels weighted by EPR participation.</td><td>{">"} 500 µs</td><td>100 – 500 µs</td><td>10 – 99 µs</td><td>{"<"} 1 µs</td><td>T1 is the hard ceiling on gate fidelity; EPR identifies dominant loss channel for improvement.</td><td>Wang et al., PRApplied 2022; Place et al., NC 2021</td></tr><tr><td>Pure Dephasing Time T_f</td><td>T_f</td><td>µs</td><td>Dephasing time due to low-frequency noise (flux, charge, 1/f); not directly from EPR but informed by participation.</td><td>{">"} 200 µs</td><td>50 – 200 µs</td><td>10 – 49 µs</td><td>{"<"} 5 µs</td><td>Limits T2; EPR participation at surfaces informs TLS dephasing contribution.</td><td>Ithier et al., PRB 2005; Bylander et al., Nature Phys 2011</td></tr><tr><td>Coherence Time T2 (Ramsey)</td><td>T2*</td><td>µs</td><td>Total dephasing time including low-frequency noise; T2* = 2T1.</td><td>{">"} 300 µs</td><td>100 – 300 µs</td><td>20 – 99 µs</td><td>{"<"} 10 µs</td><td>Practical coherence limit; T2*/2T1 ? 1 indicates pure-dephasing free regime.</td><td>Krantz et al., APR 2019; Jurcevic et al., Quantum Sci. Tech. 2021</td></tr><tr><td>Coherence Time T2 (Echo)</td><td>T2E</td><td>µs</td><td>Echo coherence time; removes low-frequency noise contributions; T2E = 2T1.</td><td>{">"} 500 µs</td><td>200 – 500 µs</td><td>50 – 199 µs</td><td>{"<"} 20 µs</td><td>Ratio T2E/T2* quantifies 1/f noise power; EPR participations guide substrate/surface optimization.</td><td>Muhonen et al., Nature Nano 2014; Yurtalan et al., Commun. Phys. 2020</td></tr><tr><td>Quality Factor Q_qubit</td><td>Q_q</td><td>dimensionless</td><td>Qubit quality factor Q = ?_q·T1; dimensionless figure of merit across frequencies.</td><td>{">"} 107</td><td>106 – 107</td><td>105 – 106</td><td>{"<"} 104</td><td>Universal metric independent of frequency; Q {">"} 107 represents state-of-the-art performance.</td><td>Kosen et al., npj QI 2022; Ganjam et al., Nature Commun. 2023</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>B. Gate Performance</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Single-Qubit Gate Fidelity</td><td>F_1Q</td><td>%</td><td>Average fidelity of single-qubit Clifford gates; limited by T1, T2, leakage (anharmonicity).</td><td>{">"} 99.9%</td><td>99.5 – 99.9%</td><td>99.0 – 99.4%</td><td>{"<"} 98%</td><td>{"<"} 99.9% limits surface-code error correction threshold; leakage tied to anharmonicity from EPR.</td><td>Barends et al., Nature 2014; Jurcevic et al., QST 2021</td></tr><tr><td>Two-Qubit Gate Fidelity</td><td>F_2Q</td><td>%</td><td>Average fidelity of two-qubit entangling gates (CZ, iSWAP); limited by ZZ, T1, T2.</td><td>{">"} 99.5%</td><td>99.0 – 99.5%</td><td>97.0 – 98.9%</td><td>{"<"} 95%</td><td>ZZ coupling (cross-Kerr from EPR) is primary source of two-qubit gate error on fixed-frequency chips.</td><td>Arute et al., Nature 2019; Sung et al., PRX 2021</td></tr><tr><td>Leakage Rate</td><td>L1</td><td>% per gate</td><td>Probability of leaking to non-computational |2? state per gate operation.</td><td>{"<"} 0.01%</td><td>{"<"} 0.1%</td><td>0.1 – 0.5%</td><td>{">"} 1.0%</td><td>Leakage non-destructively accumulates; requires active reset. Minimized by maximising anharmonicity.</td><td>Motzoi et al., PRL 2009; Wood {"&"} Gambetta, PRA 2018</td></tr><tr><td>Readout Fidelity</td><td>F_RO</td><td>%</td><td>Assignment fidelity for single-shot qubit state discrimination.</td><td>{">"} 99%</td><td>97 – 99%</td><td>90 – 96%</td><td>{"<"} 85%</td><td>Limited by ? (must be large), T1 during readout, photon number. ? extracted directly via EPR.</td><td>Walter et al., PRApplied 2017; Krantz et al., APR 2019</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>C. Spectral Properties</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Charge Dispersion</td><td>e_q</td><td>MHz</td><td>Sensitivity of qubit frequency to offset charge; exponentially suppressed in transmon regime.</td><td>{"<"} 0.01 MHz</td><td>{"<"} 0.1 MHz</td><td>0.1 – 1 MHz</td><td>{">"} 5 MHz</td><td>Large dispersion ? charge noise dephasing. EPR ratio EJ/EC must be {">"} 50 for transmon.</td><td>Koch et al., PRA 2007; Schreier et al., PRB 2008</td></tr><tr><td>EJ/EC Ratio</td><td>EJ/EC</td><td>dimensionless</td><td>Josephson to charging energy ratio; governs charge noise sensitivity vs. anharmonicity trade-off.</td><td>50 – 100</td><td>40 – 120</td><td>20 – 39</td><td>{"<"} 10</td><td>{"<"} 20: charge qubit regime with high sensitivity; {">"} 150: anharmonicity too small for fast gates.</td><td>Koch et al., PRA 2007; Krantz et al., APR 2019</td></tr><tr><td>Flux Sensitivity (tunable qubits)</td><td>??/?F</td><td>GHz/F0</td><td>Sensitivity of qubit frequency to external flux; relevant for flux-tunable transmons and SQUID qubits.</td><td>{"<"} 0.1 GHz/F0 at sweet spot</td><td>{"<"} 0.5 GHz/F0</td><td>0.5 – 2 GHz/F0</td><td>{">"} 5 GHz/F0</td><td>High flux sensitivity amplifies flux noise dephasing; biasing at sweet spot minimizes first-order sensitivity.</td><td>Hutchings et al., PRApplied 2017; Yan et al., Nature Commun. 2016</td></tr><tr><td>Frequency Spread (fabrication)</td><td>s_?/2p</td><td>MHz</td><td>Standard deviation of qubit frequencies across a chip due to junction fabrication variation.</td><td>{"<"} 5 MHz</td><td>{"<"} 20 MHz</td><td>20 – 50 MHz</td><td>{">"} 100 MHz</td><td>Large spread causes frequency collisions; EPR helps identify geometry sensitivities to dimension variation.</td><td>Kreikebaum et al., npj QI 2020; Osman et al., npj QI 2023</td></tr></tbody></table></div></details>



        </div>



        </details>



        <details className="result-category" id="epr-resonator-coupling"><summary>Resonator {"&"} Coupling</summary>



        <p className="category-note">Resonator {"&"} Coupling Parameters ? Readout and bus resonator characteristics plus qubit-resonator coupling extracted via EPR</p>



        <div className="result-nested inner">



        <details className="result-subcategory"><summary>A. Resonator Properties</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Resonator Frequency</td><td>?_r/2p</td><td>GHz</td><td>Bare resonator frequency; should be detuned from qubit to remain in dispersive regime.</td><td>6.5 – 8.5 GHz</td><td>5 – 10 GHz</td><td>3 – 5 GHz</td><td>{"<"} 2 GHz</td><td>Must satisfy |?| = |?_q - ?_r| {">"}{">"} g for dispersive approximation; EPR gives bare frequency.</td><td>Blais et al., PRA 2004; Wallraff et al., Nature 2004</td></tr><tr><td>Resonator Internal Q</td><td>Q_int</td><td>dimensionless</td><td>Internal (material-limited) quality factor of the readout resonator.</td><td>{">"} 105</td><td>104 – 105</td><td>10³ – 104</td><td>{"<"} 500</td><td>Low Q_int adds photon loss increasing measurement back-action and reducing readout SNR.</td><td>Megrant et al., APL 2012; Calusine et al., APL 2018</td></tr><tr><td>Resonator External Q</td><td>Q_ext</td><td>dimensionless</td><td>External quality factor set by coupling to transmission line; determines measurement bandwidth.</td><td>10³ – 104 (fast readout)</td><td>500 – 2×104</td><td>50 – 499</td><td>{"<"} 50</td><td>Too high ? slow readout; too low ? Purcell-enhanced qubit decay. Optimized with Purcell filter.</td><td>Reed et al., APL 2010; Houck et al., PRL 2008</td></tr><tr><td>Resonator–Qubit Detuning |?|</td><td>|?|/2p</td><td>GHz</td><td>Frequency detuning between qubit and resonator; must be large compared to coupling g.</td><td>1.0 – 3.0 GHz</td><td>0.5 – 4.0 GHz</td><td>0.1 – 0.5 GHz</td><td>{"<"} 0.05 GHz</td><td>Small detuning violates dispersive approximation; EPR hybridization factor ? tracks this.</td><td>Blais et al., PRA 2004; Gambetta et al., PRA 2006</td></tr><tr><td>Purcell Decay Rate</td><td>?_P/2p</td><td>kHz</td><td>Qubit decay rate via resonator Purcell channel; ? × (g/?)². Must be {"<"}{"<"} 1/T1_target.</td><td>{"<"} 1 kHz</td><td>1 – 10 kHz</td><td>10 – 100 kHz</td><td>{">"} 500 kHz</td><td>Dominant T1 limit in many designs without Purcell filter; directly predicted by EPR p_J^res.</td><td>Houck et al., PRL 2008; Reed et al., APL 2010</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>B. Coupling Strengths</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Transverse Coupling g/2p</td><td>g/2p</td><td>MHz</td><td>Qubit-resonator coupling strength (Jaynes-Cummings); extracted from EPR as g = v(p_J^res · ?_r · ?_q/2).</td><td>50 – 150 MHz</td><td>20 – 200 MHz</td><td>5 – 19 MHz</td><td>{"<"} 2 MHz</td><td>Sets ? and readout speed; g/|?| {"<"} 0.1 required for dispersive regime.</td><td>Wallraff et al., Nature 2004; Krantz et al., APR 2019</td></tr><tr><td>Dispersive Coupling g/? ratio</td><td>g/|?|</td><td>dimensionless</td><td>Dimensionless ratio quantifying proximity to strong-coupling limit; must be {"<"}{"<"} 1 for dispersive readout.</td><td>0.01 – 0.05</td><td>0.005 – 0.09</td><td>0.09 – 0.15</td><td>{">"} 0.20</td><td>Ratio {">"} 0.1 causes photon-number-dependent qubit dephasing and higher-order dispersive corrections.</td><td>Gambetta et al., PRA 2006; Boissonneault et al., PRA 2009</td></tr><tr><td>Bus Coupler Coupling (2Q)</td><td>J/2p</td><td>MHz</td><td>Exchange coupling between two qubits via bus resonator or direct capacitance.</td><td>5 – 20 MHz</td><td>2 – 30 MHz</td><td>0.5 – 1.9 MHz</td><td>{"<"} 0.1 MHz</td><td>Too weak ? slow two-qubit gates; too strong ? residual ZZ. EPR predicts J from geometry.</td><td>Majer et al., Nature 2007; Chen et al., PRL 2014</td></tr><tr><td>Residual ZZ (static)</td><td>?_ZZ/2p</td><td>kHz</td><td>Always-on longitudinal (ZZ) qubit–qubit interaction; source of conditional phase errors.</td><td>{"<"} 10 kHz</td><td>{"<"} 100 kHz</td><td>100 – 500 kHz</td><td>{">"} 1 MHz</td><td>Limits two-qubit gate fidelity via conditional phase accumulation; minimized by tunable couplers.</td><td>Ku et al., PRL 2020; Kandala et al., Nature 2021</td></tr><tr><td>Stray Coupling (nearest-neighbor)</td><td>J_stray/2p</td><td>kHz</td><td>Unintended coupling between non-adjacent qubits; extracted from full-chip EPR simulation.</td><td>{"<"} 10 kHz</td><td>{"<"} 50 kHz</td><td>50 – 200 kHz</td><td>{">"} 500 kHz</td><td>Degrades multi-qubit gate fidelity; EPR full-chip simulation essential to identify stray modes.</td><td>Arute et al., Nature 2019; Hertzberg et al., npj QI 2021</td></tr></tbody></table></div></details>



        </div>



        </details>



        <details className="result-category" id="epr-loss-dissipation"><summary>Loss {"&"} Dissipation</summary>



        <p className="category-note">Loss {"&"} Dissipation Parameters ? Dielectric, surface, radiation, and junction loss channels identified and weighted by EPR participations</p>



        <div className="result-nested inner">



        <details className="result-subcategory"><summary>A. Dielectric Loss (Bulk {"&"} Surface)</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Bulk Substrate Loss Tangent</td><td>tan d_bulk</td><td>dimensionless</td><td>Intrinsic dielectric loss of the substrate material (Si, sapphire, SiO2); weighted by bulk EPR participation.</td><td>{"<"} 1×10?7 (Si, sapphire)</td><td>{"<"} 1×10?6</td><td>1×10?6 – 1×10?5</td><td>{">"} 1×10?4</td><td>Silicon and sapphire are preferred substrates; amorphous SiO2 has tan d ~ 10?³ (very poor).</td><td>Martinis et al., PRL 2005; Calusine et al., APL 2018</td></tr><tr><td>Metal-Substrate Interface Loss</td><td>tan d_MS</td><td>dimensionless</td><td>Effective loss tangent of metal–substrate (MS) two-level system (TLS) interface layer.</td><td>{"<"} 1×10?³</td><td>{"<"} 3×10?³</td><td>3×10?³ – 1×10?²</td><td>{">"} 5×10?²</td><td>MS interface is typically 2–5 nm thick oxide layer; dominant loss in many planar qubits.</td><td>Wang et al., APL 2015; Niepce et al., PRApplied 2019</td></tr><tr><td>Substrate-Air Interface Loss</td><td>tan d_SA</td><td>dimensionless</td><td>Effective loss tangent of substrate–air (SA) interface; due to adsorbed surface oxides and organics.</td><td>{"<"} 3×10?³</td><td>{"<"} 1×10?²</td><td>1×10?² – 5×10?²</td><td>{">"} 0.1</td><td>Cleaning and surface passivation reduce SA loss; participation ratio from EPR isolates this channel.</td><td>Wenner et al., APL 2011; Quintana et al., APL 2014</td></tr><tr><td>Metal-Air Interface Loss</td><td>tan d_MA</td><td>dimensionless</td><td>Effective loss tangent of metal–air (MA) interface; native oxide on superconducting film top surface.</td><td>{"<"} 3×10?³</td><td>{"<"} 1×10?²</td><td>1×10?² – 5×10?²</td><td>{">"} 0.1</td><td>Nb and Al form native oxides; replacing top surface with clean metal reduces MA loss.</td><td>Sandberg et al., APL 2012; Nersisyan et al., Quantum 2019</td></tr><tr><td>Surface Participation Ratio (MS)</td><td>p_MS</td><td>dimensionless</td><td>Fraction of electric field energy in metal-substrate interface region; computed from EPR E-field.</td><td>{"<"} 5×10?4</td><td>{"<"} 2×10?³</td><td>2×10?³ – 1×10?²</td><td>{">"} 5×10?²</td><td>Thinner gaps increase p_MS; EPR identifies geometry changes to reduce interface participation.</td><td>Wenner et al., APL 2011; Gambetta et al., npj QI 2017</td></tr><tr><td>TLS-Limited Quality Factor (1/f)</td><td>Q_TLS</td><td>dimensionless</td><td>Quality factor limited by two-level system (TLS) bath; power- and temperature-dependent.</td><td>{">"} 3×106</td><td>106 – 3×106</td><td>105 – 106</td><td>{"<"} 104</td><td>Q_TLS improves with high drive power (TLS saturation); EPR participations give TLS contribution breakdown.</td><td>Martinis et al., PRL 2005; Müller et al., PRB 2019</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>B. Radiation {"&"} Geometry Loss</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Radiation Loss Rate</td><td>?_rad/2p</td><td>kHz</td><td>Energy loss due to electromagnetic radiation from non-closed geometry; computed by EPR from far-field.</td><td>{"<"} 1 kHz</td><td>{"<"} 10 kHz</td><td>10 – 100 kHz</td><td>{">"} 500 kHz</td><td>Open transmission line stubs or poorly designed ground planes lead to radiation loss.</td><td>Houck et al., PRL 2008; Solgun et al., PRApplied 2019</td></tr><tr><td>Seam Loss (3D cavities)</td><td>?_seam/2p</td><td>kHz</td><td>Loss at mechanical seam between cavity halves; critical for 3D transmon and fluxonium devices.</td><td>{"<"} 1 kHz</td><td>{"<"} 5 kHz</td><td>5 – 50 kHz</td><td>{">"} 200 kHz</td><td>EPR current participation at seam predicts seam loss; improved by indium bonding or tight tolerances.</td><td>Reagor et al., PRB 2016; Brecht et al., npj QI 2016</td></tr><tr><td>Quasiparticle Loss Rate</td><td>?_qp/2p</td><td>kHz</td><td>Qubit decay due to nonequilibrium quasiparticles tunneling across junction.</td><td>{"<"} 2 kHz</td><td>{"<"} 20 kHz</td><td>20 – 100 kHz</td><td>{">"} 500 kHz</td><td>Quasiparticle poisoning is stochastic; mitigated by gap engineering and quasiparticle traps.</td><td>Catelani et al., PRL 2011; Serniak et al., PRL 2018</td></tr><tr><td>Vortex Loss (in-field operation)</td><td>?_vortex/2p</td><td>kHz</td><td>Loss from magnetic vortices in superconducting film when operated in residual magnetic field.</td><td>{"<"} 1 kHz ({"<"} 1 µT shield)</td><td>{"<"} 10 kHz</td><td>10 – 100 kHz</td><td>{">"} 500 kHz</td><td>Mitigated by magnetic shielding and moat structures; EPR current maps identify vortex-sensitive areas.</td><td>Stan et al., IEEE Trans. 2004; Chiaro et al., Supercond. Sci. Tech. 2016</td></tr><tr><td>Conductor (Ohmic) Loss</td><td>?_ohm/2p</td><td>kHz</td><td>Residual ohmic loss from non-superconducting regions or above Tc contributions; usually negligible in Al.</td><td>{"<"} 0.1 kHz</td><td>{"<"} 1 kHz</td><td>1 – 10 kHz</td><td>{">"} 100 kHz</td><td>Typically negligible at mK temperatures; relevant for normal-metal contacts or resistive wirebonds.</td><td>Göppl et al., JAP 2008; Barends et al., APL 2010</td></tr></tbody></table></div></details>



        </div>



        </details>



        <details className="result-category" id="epr-junction-parameters"><summary>Junction Parameters</summary>



        <p className="category-note">Josephson Junction Parameters ? Junction electrical and physical parameters extracted from or used as inputs to EPR analysis</p>



        <div className="result-nested inner">



        <details className="result-subcategory"><summary>A. Junction Electrical Parameters</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Josephson Inductance</td><td>L_J</td><td>nH</td><td>Linear (small-signal) inductance of Josephson junction; L_J = F0/(2pI_c). Central EPR input.</td><td>5 – 20 nH</td><td>2 – 50 nH</td><td>50 – 200 nH</td><td>{">"} 500 nH</td><td>Sets qubit frequency via ?_q = 1/v(L_J·C_S); too large ? very low frequency, thermally excited.</td><td>Koch et al., PRA 2007; Krantz et al., APR 2019</td></tr><tr><td>Critical Current</td><td>I_c</td><td>µA</td><td>Maximum supercurrent through junction; I_c = F0/(2pL_J). Sets EJ = I_c·F0/(2p).</td><td>20 – 80 nA (transmon)</td><td>5 – 200 nA</td><td>200 nA – 2 µA</td><td>{">"} 10 µA</td><td>Too high ? small L_J ? high frequency; too low ? large L_J, strong flux noise sensitivity.</td><td>Dolan 1977 (shadow evaporation); Ambegaokar {"&"} Baratoff, PRL 1963</td></tr><tr><td>Critical Current Density</td><td>J_c</td><td>A/m²</td><td>Critical current per junction area; set by AlOx barrier thickness during deposition.</td><td>100 – 500 A/m²</td><td>50 – 1000 A/m²</td><td>1000 – 5000 A/m²</td><td>{">"} 104 A/m²</td><td>Reproducibility of J_c determines frequency spread; EPR sensitivity analysis relates Jc to ?_q.</td><td>Pop et al., Nature 2014; Osman et al., npj QI 2023</td></tr><tr><td>Junction Capacitance</td><td>C_J</td><td>fF</td><td>Self-capacitance of the junction; contributes to total qubit capacitance C_S.</td><td>2 – 10 fF</td><td>1 – 20 fF</td><td>20 – 100 fF</td><td>{">"} 200 fF</td><td>Large C_J reduces charging energy EC, lowering anharmonicity; EPR partitions C_J from shunt.</td><td>Koch et al., PRA 2007; Yan et al., PRApplied 2016</td></tr><tr><td>Junction Area</td><td>A_J</td><td>µm²</td><td>Physical overlap area of the junction; A_J = I_c/J_c. Fabrication controlled.</td><td>0.01 – 0.1 µm²</td><td>0.005 – 0.5 µm²</td><td>0.5 – 2 µm²</td><td>{">"} 5 µm²</td><td>Larger area ? larger C_J and lower EC; smaller area ? harder fabrication, larger variation.</td><td>Kreikebaum et al., npj QI 2020; Hertzberg et al., npj QI 2021</td></tr><tr><td>Josephson Energy</td><td>EJ/h</td><td>GHz</td><td>Josephson energy EJ = I_c·F0/(2p); governs tunneling energy.</td><td>10 – 50 GHz</td><td>5 – 100 GHz</td><td>100 – 500 GHz</td><td>{">"} 1 THz</td><td>With EC, determines qubit spectrum; EJ/EC {">"} 50 for transmon regime.</td><td>Koch et al., PRA 2007; Nakamura et al., Nature 1999</td></tr><tr><td>Charging Energy</td><td>EC/h</td><td>MHz</td><td>Charging energy EC = e²/(2C_S); determines anharmonicity and charge sensitivity.</td><td>150 – 350 MHz</td><td>100 – 500 MHz</td><td>500 MHz – 1 GHz</td><td>{">"} 2 GHz</td><td>EC ~ anharmonicity for transmon; high EC ? charge qubit regime, high noise sensitivity.</td><td>Koch et al., PRA 2007; Schreier et al., PRB 2008</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>B. Junction Loss {"&"} Quality</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Junction Loss Tangent</td><td>tan d_J</td><td>dimensionless</td><td>Intrinsic dielectric loss of AlOx tunnel barrier; limits junction Q and T1.</td><td>{"<"} 3×10?6</td><td>{"<"} 1×10?5</td><td>1×10?5 – 1×10?4</td><td>{">"} 1×10?³</td><td>TLS in AlOx barrier is historically the primary T1 limit; improved by ALD or crystalline barriers.</td><td>Martinis et al., PRL 2005; Müller et al., PRB 2019</td></tr><tr><td>Junction Subgap Resistance</td><td>R_sg</td><td>GO</td><td>Subgap resistance of junction; represents quasiparticle leakage channel.</td><td>{">"} 100 GO</td><td>10 – 100 GO</td><td>1 – 10 GO</td><td>{"<"} 100 MO</td><td>Low R_sg indicates excess quasiparticle density; limits T1 via quasiparticle poisoning.</td><td>Aumentado et al., PRL 2004; Aumentado et al., J. Low Temp. Phys. 2011</td></tr><tr><td>Flux Noise Spectral Density</td><td>S_F(1Hz)</td><td>µF0²/Hz</td><td>Amplitude of 1/f flux noise at 1 Hz; governs dephasing for flux-sensitive qubits.</td><td>{"<"} 1 µF0²/Hz</td><td>1 – 5 µF0²/Hz</td><td>5 – 20 µF0²/Hz</td><td>{">"} 50 µF0²/Hz</td><td>Arises from surface spin fluctuators; EPR current participation at surfaces informs sensitivity.</td><td>Yoshihara et al., PRL 2006; Bialczak et al., PRL 2007</td></tr><tr><td>Charge Noise Spectral Density</td><td>S_q(1Hz)</td><td>e²/Hz</td><td>Amplitude of 1/f charge noise; relevant for charge-sensitive qubits.</td><td>{"<"} 10?7 e²/Hz</td><td>{"<"} 10?6 e²/Hz</td><td>10?6 – 10?5 e²/Hz</td><td>{">"} 10?4 e²/Hz</td><td>Exponentially suppressed in transmon regime; relevant for qubits with EJ/EC {"<"} 20.</td><td>Ithier et al., PRB 2005; Paladino et al., RMP 2014</td></tr></tbody></table></div></details>



        </div>



        </details>



        <details className="result-category" id="epr-simulation-convergence"><summary>Simulation Convergence</summary>



        <p className="category-note">Simulation Convergence {"&"} Accuracy Metrics ? HFSS / pyEPR / Ansys eigenmode simulation quality indicators for reliable EPR extraction</p>



        <div className="result-nested inner">



        <details className="result-subcategory"><summary>A. Eigenmode Solver Convergence</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Eigenfrequency Convergence ?Freq</td><td>?f/f</td><td>ppm</td><td>Relative change in eigenfrequency between successive mesh refinement passes.</td><td>{"<"} 5 ppm</td><td>{"<"} 50 ppm</td><td>50 – 500 ppm</td><td>{">"} 1000 ppm</td><td>EPR frequencies directly set qubit and resonator values; poor convergence propagates to all outputs.</td><td>Minev Thesis Yale 2018; Ansys HFSS Documentation 2023</td></tr><tr><td>Energy Error (Maxwell equations)</td><td>?U/U</td><td>%</td><td>Relative error in total electromagnetic energy from adaptive mesh refinement.</td><td>{"<"} 0.1%</td><td>{"<"} 0.5%</td><td>0.5 – 2%</td><td>{">"} 5%</td><td>Energy error directly bounds participation ratio error; must be minimised for accurate loss prediction.</td><td>Minev Thesis Yale 2018; Jin, FEM for Electromagnetics, 1993</td></tr><tr><td>Tetrahedral Mesh Count</td><td>N_mesh</td><td>thousands</td><td>Number of tetrahedra in adaptive mesh; convergence criterion, not absolute target.</td><td>200 – 2000k</td><td>50 – 200k</td><td>10 – 50k</td><td>{"<"} 5k</td><td>Too few ? inaccurate fields, especially at thin features (junctions, gaps); too many ? slow.</td><td>Minev Thesis Yale 2018; Solgun et al., PRApplied 2019</td></tr><tr><td>Number of Eigenmode Passes</td><td>N_passes</td><td>integer</td><td>Adaptive refinement passes until convergence criterion is met.</td><td>10 – 20 passes</td><td>7 – 10 passes</td><td>4 – 6 passes</td><td>{"<"} 3 passes</td><td>Insufficient passes leave mesh unrefined in critical regions (junction vicinity, surface gaps).</td><td>pyEPR documentation; Minev GitHub 2018</td></tr><tr><td>Mode Participation Sum Check</td><td>Sp</td><td>dimensionless</td><td>Sum of EPR participations across all modes; should equal 1 for each junction.</td><td>0.99 – 1.01</td><td>0.97 – 1.03</td><td>0.93 – 1.07</td><td>{"<"} 0.90 or {">"} 1.10</td><td>Deviation indicates missing eigenmodes, disconnected networks, or mesh error in junction volume.</td><td>Minev et al., Nature 2021; Nigg et al., PRL 2012</td></tr><tr><td>Participation Ratio Repeatability</td><td>s_p/p</td><td>%</td><td>Run-to-run relative standard deviation of participation ratios across identical simulations.</td><td>{"<"} 0.5%</td><td>{"<"} 2%</td><td>2 – 5%</td><td>{">"} 10%</td><td>Poor repeatability indicates stochastic mesh seeding issues; use fixed seed and fine mesh.</td><td>Minev Thesis Yale 2018</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>B. Loss Analysis Simulation Quality</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Description</th><th>Optimal / Best Value</th><th>Good Range</th><th>Acceptable Range</th><th>Poor / Worst Value</th><th>Physical Significance</th><th>Key References</th></tr></thead><tbody><tr><td>Surface Participation Error</td><td>?p_surf</td><td>%</td><td>Relative error in surface (interface) participation ratio from finite mesh at thin layers.</td><td>{"<"} 2%</td><td>{"<"} 5%</td><td>5 – 15%</td><td>{">"} 20%</td><td>Thin oxide layers (2–5 nm) require extremely fine mesh; often estimated analytically.</td><td>Wenner et al., APL 2011; Gambetta et al., npj QI 2017</td></tr><tr><td>Junction Volume Definition Accuracy</td><td>?V_J/V_J</td><td>%</td><td>Relative accuracy of the junction geometric volume used to compute junction participation.</td><td>{"<"} 1%</td><td>{"<"} 5%</td><td>5 – 10%</td><td>{">"} 20%</td><td>Junction volume error directly maps to participation ratio error; critical CAD accuracy needed.</td><td>Minev Thesis Yale 2018; Solgun et al., PRApplied 2019</td></tr><tr><td>Number of Loss Regions Modelled</td><td>N_regions</td><td>integer</td><td>Number of distinct lossy material regions (interfaces) explicitly included in the EPR model.</td><td>= 4 (MS, SA, MA, bulk)</td><td>3</td><td>2</td><td>1 (bulk only)</td><td>Modelling only bulk misses dominant surface/interface losses in planar devices.</td><td>Wenner et al., APL 2011; Wang et al., APL 2015</td></tr><tr><td>Frequency Band of Validity</td><td>BW_valid</td><td>GHz</td><td>Frequency range over which the extracted Hamiltonian parameters are valid (no spurious modes).</td><td>0 – 15 GHz (no spurious)</td><td>0 – 10 GHz</td><td>5 – 10 GHz only</td><td>Spurious modes present</td><td>Spurious modes can hybridize with qubit and resonator, invalidating EPR sums.</td><td>Minev Thesis 2018; Reagor et al., PRB 2016</td></tr></tbody></table></div></details>



        </div>



        </details>



        <details className="result-category" id="epr-summary-table"><summary>Summary Table</summary>



        <p className="category-note">EPR Analysis — Master Summary Table ? All EPR output parameters consolidated — one row per parameter, sorted by category</p>



        <div className="result-nested inner">



        <details className="result-subcategory"><summary>?  Core EPR</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Optimal Value</th><th>Good Range</th><th>Acceptable Range</th><th>Worst Value</th><th>Physical Significance</th><th>Improvement Strategy</th><th>Reference</th></tr></thead><tbody><tr><td>1</td><td>Core EPR</td><td>Junction Participation Ratio</td><td>p_J</td><td>—</td><td>0.90–0.99</td><td>0.80–0.99</td><td>0.50–0.79</td><td>{"<"} 0.30</td><td>Sets anharmonicity {"&"} qubit nonlinearity</td><td>Increase pad size, reduce gap to substrate</td><td>Minev et al., Nature 2021</td></tr><tr><td>2</td><td>Core EPR</td><td>Resonator Junction Participation</td><td>p_J^res</td><td>—</td><td>{"<"} 1×10?³</td><td>{"<"} 1×10?²</td><td>1×10?²–5×10?²</td><td>{">"} 0.10</td><td>Determines Purcell T1 limit</td><td>Increase qubit-resonator detuning</td><td>Reed et al., PRL 2010</td></tr><tr><td>3</td><td>Core EPR</td><td>ZPF Voltage across Junction</td><td>V_zpf</td><td>µV</td><td>10–50 µV</td><td>5–100 µV</td><td>1–200 µV</td><td>{"<"} 0.5 µV</td><td>Governs qubit-photon coupling</td><td>Optimise mode volume and pad geometry</td><td>Minev et al., Nature 2021</td></tr><tr><td>4</td><td>Core EPR</td><td>ZPF Phase</td><td>f_zpf</td><td>rad</td><td>0.1–0.5 rad</td><td>0.05–0.6 rad</td><td>0.6–0.9 rad</td><td>{">"} 1.0 rad</td><td>Validity of dispersive approximation</td><td>Reduce anharmonicity target or redesign</td><td>Minev Thesis 2018</td></tr><tr><td>5</td><td>Core EPR</td><td>Anharmonicity (EPR)</td><td>a/2p</td><td>MHz</td><td>150–350 MHz</td><td>100–400 MHz</td><td>50–99 MHz</td><td>{"<"} 30 MHz</td><td>Gate speed and leakage limit</td><td>Lower EJ/EC ratio; smaller junction</td><td>Koch et al., PRA 2007</td></tr><tr><td>6</td><td>Core EPR</td><td>Dispersive Shift ?</td><td>?/2p</td><td>MHz</td><td>0.5–3 MHz</td><td>0.1–5 MHz</td><td>0.01–0.09 MHz</td><td>{"<"} 0.01 MHz</td><td>Readout contrast</td><td>Adjust g/|?| ratio via geometry</td><td>Blais et al., PRA 2004</td></tr><tr><td>7</td><td>Core EPR</td><td>Cross-Kerr ZZ</td><td>?_ij/2p</td><td>MHz</td><td>{"<"} 0.01 MHz</td><td>{"<"} 0.10 MHz</td><td>0.10–0.50 MHz</td><td>{">"} 1.0 MHz</td><td>Always-on 2Q gate error</td><td>Tunable coupler; echo sequences</td><td>Kandala et al., Nature 2021</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>?  Qubit Performance</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Optimal Value</th><th>Good Range</th><th>Acceptable Range</th><th>Worst Value</th><th>Physical Significance</th><th>Improvement Strategy</th><th>Reference</th></tr></thead><tbody><tr><td>8</td><td>Qubit Performance</td><td>Energy Relaxation T1</td><td>T1</td><td>µs</td><td>{">"} 500 µs</td><td>100–500 µs</td><td>10–99 µs</td><td>{"<"} 1 µs</td><td>Hard limit on gate fidelity</td><td>Reduce dominant loss channel from EPR</td><td>Wang et al., PRApplied 2022</td></tr><tr><td>9</td><td>Qubit Performance</td><td>Coherence Time T2*</td><td>T2*</td><td>µs</td><td>{">"} 300 µs</td><td>100–300 µs</td><td>20–99 µs</td><td>{"<"} 10 µs</td><td>Practical dephasing limit</td><td>Reduce flux/charge noise; surface cleaning</td><td>Krantz et al., APR 2019</td></tr><tr><td>10</td><td>Qubit Performance</td><td>Qubit Quality Factor</td><td>Q_q</td><td>—</td><td>{">"} 107</td><td>106–107</td><td>105–106</td><td>{"<"} 104</td><td>Universal figure of merit</td><td>Reduce all participation-weighted losses</td><td>Ganjam et al., NC 2023</td></tr><tr><td>11</td><td>Qubit Performance</td><td>Single-Qubit Gate Fidelity</td><td>F_1Q</td><td>%</td><td>{">"} 99.9%</td><td>99.5–99.9%</td><td>99.0–99.4%</td><td>{"<"} 98%</td><td>Surface-code threshold</td><td>Increase T1/T2; optimise DRAG pulses</td><td>Barends et al., Nature 2014</td></tr><tr><td>12</td><td>Qubit Performance</td><td>Two-Qubit Gate Fidelity</td><td>F_2Q</td><td>%</td><td>{">"} 99.5%</td><td>99.0–99.5%</td><td>97.0–98.9%</td><td>{"<"} 95%</td><td>2Q error correction threshold</td><td>Reduce ZZ via tunable coupler design</td><td>Arute et al., Nature 2019</td></tr><tr><td>13</td><td>Qubit Performance</td><td>EJ/EC Ratio</td><td>EJ/EC</td><td>—</td><td>50–100</td><td>40–120</td><td>20–39</td><td>{"<"} 10</td><td>Charge noise protection</td><td>Increase shunt capacitance C_S</td><td>Koch et al., PRA 2007</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>?  Resonator {"&"} Coupling</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Optimal Value</th><th>Good Range</th><th>Acceptable Range</th><th>Worst Value</th><th>Physical Significance</th><th>Improvement Strategy</th><th>Reference</th></tr></thead><tbody><tr><td>14</td><td>Resonator {"&"} Coupling</td><td>Resonator Frequency</td><td>?_r/2p</td><td>GHz</td><td>6.5–8.5 GHz</td><td>5–10 GHz</td><td>3–5 GHz</td><td>{"<"} 2 GHz</td><td>Dispersive regime requirement</td><td>Adjust resonator length/capacitance</td><td>Blais et al., PRA 2004</td></tr><tr><td>15</td><td>Resonator {"&"} Coupling</td><td>Resonator Internal Q</td><td>Q_int</td><td>—</td><td>{">"} 105</td><td>104–105</td><td>10³–104</td><td>{"<"} 500</td><td>Readout SNR and back-action</td><td>Improve substrate and metal quality</td><td>Megrant et al., APL 2012</td></tr><tr><td>16</td><td>Resonator {"&"} Coupling</td><td>Coupling Strength g/2p</td><td>g/2p</td><td>MHz</td><td>50–150 MHz</td><td>20–200 MHz</td><td>5–19 MHz</td><td>{"<"} 2 MHz</td><td>Sets ? and readout bandwidth</td><td>Adjust coupling capacitor geometry</td><td>Wallraff et al., Nature 2004</td></tr><tr><td>17</td><td>Resonator {"&"} Coupling</td><td>Purcell Decay Rate</td><td>?_P/2p</td><td>kHz</td><td>{"<"} 1 kHz</td><td>1–10 kHz</td><td>10–100 kHz</td><td>{">"} 500 kHz</td><td>T1 limit via resonator</td><td>Add Purcell filter; increase detuning</td><td>Houck et al., PRL 2008</td></tr><tr><td>18</td><td>Resonator {"&"} Coupling</td><td>Residual ZZ Static</td><td>?_ZZ/2p</td><td>kHz</td><td>{"<"} 10 kHz</td><td>{"<"} 100 kHz</td><td>100–500 kHz</td><td>{">"} 1 MHz</td><td>Conditional phase error</td><td>Tunable coupler; frequency detuning</td><td>Ku et al., PRL 2020</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>?  Loss {"&"} Dissipation</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Optimal Value</th><th>Good Range</th><th>Acceptable Range</th><th>Worst Value</th><th>Physical Significance</th><th>Improvement Strategy</th><th>Reference</th></tr></thead><tbody><tr><td>19</td><td>Loss {"&"} Dissipation</td><td>Bulk Substrate Loss Tangent</td><td>tan d_bulk</td><td>—</td><td>{"<"} 1×10?7</td><td>{"<"} 1×10?6</td><td>1×10?6–1×10?5</td><td>{">"} 1×10?4</td><td>Bulk energy dissipation</td><td>Use float-zone Si or sapphire</td><td>Martinis et al., PRL 2005</td></tr><tr><td>20</td><td>Loss {"&"} Dissipation</td><td>Metal-Substrate Interface Loss</td><td>tan d_MS</td><td>—</td><td>{"<"} 1×10?³</td><td>{"<"} 3×10?³</td><td>3×10?³–1×10?²</td><td>{">"} 5×10?²</td><td>Dominant TLS loss channel</td><td>Ion mill before deposition; clean surfaces</td><td>Wang et al., APL 2015</td></tr><tr><td>21</td><td>Loss {"&"} Dissipation</td><td>Surface Participation (MS)</td><td>p_MS</td><td>—</td><td>{"<"} 5×10?4</td><td>{"<"} 2×10?³</td><td>2×10?³–1×10?²</td><td>{">"} 5×10?²</td><td>Weights MS interface loss to T1</td><td>Wider gaps; ground plane design</td><td>Wenner et al., APL 2011</td></tr><tr><td>22</td><td>Loss {"&"} Dissipation</td><td>TLS-Limited Q</td><td>Q_TLS</td><td>—</td><td>{">"} 3×106</td><td>106–3×106</td><td>105–106</td><td>{"<"} 104</td><td>TLS bath limitation</td><td>Surface treatment; new barrier materials</td><td>Müller et al., PRB 2019</td></tr><tr><td>23</td><td>Loss {"&"} Dissipation</td><td>Seam Loss Rate (3D)</td><td>?_seam/2p</td><td>kHz</td><td>{"<"} 1 kHz</td><td>{"<"} 5 kHz</td><td>5–50 kHz</td><td>{">"} 200 kHz</td><td>3D cavity assembly limit</td><td>Indium sealing; tighter tolerances</td><td>Reagor et al., PRB 2016</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>?  Junction Parameters</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Optimal Value</th><th>Good Range</th><th>Acceptable Range</th><th>Worst Value</th><th>Physical Significance</th><th>Improvement Strategy</th><th>Reference</th></tr></thead><tbody><tr><td>24</td><td>Junction Parameters</td><td>Josephson Inductance</td><td>L_J</td><td>nH</td><td>5–20 nH</td><td>2–50 nH</td><td>50–200 nH</td><td>{">"} 500 nH</td><td>Sets qubit frequency</td><td>Junction area and J_c control</td><td>Koch et al., PRA 2007</td></tr><tr><td>25</td><td>Junction Parameters</td><td>Josephson Energy</td><td>EJ/h</td><td>GHz</td><td>10–50 GHz</td><td>5–100 GHz</td><td>100–500 GHz</td><td>{">"} 1 THz</td><td>Qubit spectrum with EC</td><td>Barrier thickness and area</td><td>Nakamura et al., Nature 1999</td></tr><tr><td>26</td><td>Junction Parameters</td><td>Charging Energy</td><td>EC/h</td><td>MHz</td><td>150–350 MHz</td><td>100–500 MHz</td><td>500–1000 MHz</td><td>{">"} 2 GHz</td><td>Anharmonicity and charge sensitivity</td><td>Shunt capacitor area tuning</td><td>Koch et al., PRA 2007</td></tr><tr><td>27</td><td>Junction Parameters</td><td>Junction Loss Tangent</td><td>tan d_J</td><td>—</td><td>{"<"} 3×10?6</td><td>{"<"} 1×10?5</td><td>1×10?5–1×10?4</td><td>{">"} 1×10?³</td><td>Intrinsic junction T1 limit</td><td>ALD AlOx; crystalline barriers</td><td>Martinis et al., PRL 2005</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>?  Simulation</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Optimal Value</th><th>Good Range</th><th>Acceptable Range</th><th>Worst Value</th><th>Physical Significance</th><th>Improvement Strategy</th><th>Reference</th></tr></thead><tbody><tr><td>28</td><td>Simulation</td><td>Eigenfrequency Convergence</td><td>?f/f</td><td>ppm</td><td>{"<"} 5 ppm</td><td>{"<"} 50 ppm</td><td>50–500 ppm</td><td>{">"} 1000 ppm</td><td>Accuracy of all extracted parameters</td><td>More refinement passes; finer mesh</td><td>Minev Thesis Yale 2018</td></tr><tr><td>29</td><td>Simulation</td><td>Energy Error</td><td>?U/U</td><td>%</td><td>{"<"} 0.1%</td><td>{"<"} 0.5%</td><td>0.5–2%</td><td>{">"} 5%</td><td>Bounds participation ratio error</td><td>Increase mesh density at interfaces</td><td>Ansys HFSS Docs 2023</td></tr><tr><td>30</td><td>Simulation</td><td>Participation Sum Check</td><td>Sp</td><td>—</td><td>0.99–1.01</td><td>0.97–1.03</td><td>0.93–1.07</td><td>{"<"} 0.90 or {">"} 1.10</td><td>Simulation completeness check</td><td>Include all eigenmodes up to 20 GHz</td><td>Minev et al., Nature 2021</td></tr></tbody></table></div></details>



        <details className="result-subcategory"><summary>Total Parameters:  30</summary><div className="result-table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Parameter</th><th>Symbol</th><th>Unit</th><th>Optimal Value</th><th>Good Range</th><th>Acceptable Range</th><th>Worst Value</th><th>Physical Significance</th><th>Improvement Strategy</th><th>Reference</th></tr></thead><tbody></tbody></table></div></details>



        </div>



        </details>



        </div></details></div>
    </>
  ),

  "api-reference": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">API Reference</p>



          <h2>API Reference</h2>



          <p>



            The API reference should document the endpoints that connect QClang to the backend.



            Keep endpoint descriptions simple until final request and response schemas are ready.



          </p>



          <table>



            <thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>



            <tbody>



              <tr><td>GET</td><td><code>/api/qclang/status</code></td><td>Check available dialects and compiler support.</td></tr>



              <tr><td>GET</td><td><code>/api/qclang/examples</code></td><td>Load built-in QClang examples.</td></tr>



              <tr><td>POST</td><td><code>/api/qclang/parse</code></td><td>Parse source into an AST-style result.</td></tr>



              <tr><td>POST</td><td><code>/api/qclang/compile</code></td><td>Compile source into the selected target output.</td></tr>



            </tbody>



          </table>



        
    </>
  ),

  "integration": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Integration</p>



          <h2>Integration</h2>



          <p>



            Integration documentation should explain how QClang connects the editor, backend



            compiler, design graph, routing, DRC, and exports. For now, this page gives only



            the intended integration parameters.



          </p>



          <div className="parameter-table">



            <article><strong>Frontend editor</strong><span>Writes and submits QClang source text.</span></article>



            <article><strong>Backend router</strong><span>Receives parse and compile API requests.</span></article>



            <article><strong>Compiler service</strong><span>Parses, validates, and compiles source.</span></article>



            <article><strong>Design pipeline</strong><span>Uses compiler output for graph, routing, checks, and exports.</span></article>



          </div>



        
    </>
  ),

  "support": ({ activeHash, onNavigate }) => (
    <>




          <p className="eyebrow">Support</p>



          <h2>Support</h2>



          <p>



            Access official channels, developer resources, and reference documentation to assist with



            your QClang development, compilation, and integration workflows.



          </p>



          <ul className="learning-list">



            <li>Review the comprehensive <strong>Getting Started</strong> guide.</li>



            <li>Consult the <strong>Language Blocks Reference</strong> for syntax definitions.</li>



            <li>Explore the <strong>Compiler Pipeline Reference</strong> for optimization flags.</li>



            <li>Submit issues or contribute via the official repository.</li>



          </ul>



        
    </>
  ),

};

export const SEARCH_ITEMS = [
  {
    "id": "home",
    "title": "QClang compiler and language documentation.",
    "text": "QClang Development Documentation. QClang is a hardware description language for describing superconducting quantum chip designs. This documentation outlines compiler parameters, syntax blocks, synthesis steps, and simulation verification. Start tutorial View compiler pipeline .qc / .qcl language files for quantum chip source descriptions. 3 main outputs: Qiskit Metal, JSON IR, and SPICE-style text."
  },
  {
    "id": "getting-started",
    "title": "Onboarding Tutorial",
    "text": "Onboarding Tutorial Onboarding Tutorial Copy page This page introduces the QClang workflow from a foundational level. An engineer should first understand what a QClang source file represents, how it is parsed, how it becomes an internal design model, and how that model is exported to downstream chip design tools. Foundational: learn chip, qubit, coupler, readout, and design rule parameters. Intermediate: learn parse, validate, compile, and export stages. Advanced: connect QClang with backend APIs, design graph, routing, DRC, and exports."
  },
  {
    "id": "hello-world",
    "title": "Hello World",
    "text": "Hello World Copy page A basic QClang example declares a single chip and fundamental hardware objects, demonstrating the structural syntax of the language before scaling to complex topologies. hello.qc chip HelloChip variable substrate = \"silicon\" variable metal = \"aluminum\" qubit Q1 type=transmon frequency=5.0 readout RO_Q1 connect(Q1) end What this example introduces Chip metadata, a single qubit, and a readout object connected to that qubit."
  },
  {
    "id": "installation",
    "title": "Installation",
    "text": "Setup Installation Configure the QClang compiler toolchain to integrate it with the chip synthesis backend. This guide outlines setting up the environment, compiling packages, and verifying paths for production workflows. Backend root Project backend folder where QClang services run. Compiler package QClang lexer, parser, validator, compiler, and full dialect modules. Examples folder Place for sample .qc and .qcl files used by new users."
  },
  {
    "id": "using-python",
    "title": "Using Python and QClang",
    "text": "Development Using Python and QClang Python is used to expose QClang compiler functions through backend services. This section should explain the normal developer flow: load source text, parse it, validate it, compile it, and return a structured response. Conceptual flow source = read_qclang_file(\"design.qc\") ast = parse(source) validation = validate(ast) result = compile(ast, target=\"json_ir\")"
  },
  {
    "id": "user-guide",
    "title": "User Guide",
    "text": "User Guide User Guide The user guide should teach how QClang fits into the full quantum chip design workflow. It should stay practical: what users write, what the compiler reads, and what the backend returns. 1 Write Create QClang source with chip, qubit, coupler, and readout declarations. 2 Validate Check structure, references, units, and design constraints. 3 Compile Generate design output for JSON inspection or chip design tooling."
  },
  {
    "id": "qclang-overview",
    "title": "QClang Overview Tutorial",
    "text": "Overview Tutorial QClang Overview Tutorial QClang is a small domain language for quantum chip design. It should describe a design in a readable way, then let the compiler convert that design into structured outputs. Source language: the user-facing chip description. AST: the internal parsed representation. Design graph: the shared structure used by routing, DRC, and exports. Generated output: the result returned to the frontend or saved as artifacts."
  },
  {
    "id": "syntax-part-1",
    "title": "Syntax Tutorial - Part 1",
    "text": "Syntax Syntax Tutorial - Part 1 This section covers the core declaration syntaxes and structure of QClang files, focusing on variables, physical hardware blocks, and connectivity definitions. Declarations Use declarations for chip, qubit, coupler, readout, feedline, and launchpad objects. Properties Use properties for frequency, material, topology, chip size, spacing, and routing options."
  },
  {
    "id": "syntax-part-2",
    "title": "Syntax Tutorial - Part 2",
    "text": "Syntax Syntax Tutorial - Part 2 Advanced QClang syntax definitions allow specifying target layouts, physical design rule constraints, and compilation targets for hardware compilation.  Topology grid, heavy-hex, chain, or project-specific topology names. Rules Spacing, frequency, fabrication, and connectivity constraints. Targets qiskit_metal, json_ir, spice, qclang export, and design reports."
  },
  {
    "id": "language-reference",
    "title": "Language Blocks",
    "text": "Language Reference Language Blocks This reference page documents the primary declarative block components supported by the QClang language specification. Each block maps directly to physical layout and synthesis parameters. chip Defines global design metadata such as name, substrate, metal, topology, and chip size. qubit Defines a quantum device node, usually with type, frequency, placement, and group parameters. coupler Defines a connection between two qubits and optional coupling strength. readout Defines readout resonator objects connected to target qubits. feedline Defines the shared microwave route that connects readout components. launchpad Defines chip input/output access points for routing and exports."
  },
  {
    "id": "compiler-reference",
    "title": "Compiler Pipeline",
    "text": "Compiler Reference Compiler Pipeline The QClang compiler utilizes a multi-stage translation pipeline that processes declarative source code into optimized intermediate representations and downstream synthesis models.  Stage Purpose Expected output Lexer Reads source characters and creates tokens. Token stream Parser Builds the abstract syntax tree from tokens. AST Validator Checks structure, references, and required fields. Validation report Compiler Converts the parsed design into backend-ready output. Generated result Full dialect Supports extended .qcl features such as braces, arrays, and export targets. JSON IR, SPICE, or Metal code"
  },
  {
    "id": "design-rules",
    "title": "Design Rules",
    "text": "Design Rules Design Rules QClang documentation should include design rule parameters so users understand what the compiler or design pipeline may check later. Geometry rules Spacing, overlap, off-chip placement, and route collision checks. Frequency rules Qubit frequency spacing, readout separation, and collision avoidance. Fabrication rules Minimum widths, clearances, material assumptions, and process constraints. Connectivity rules Qubit-coupler-readout consistency and missing connection checks."
  },
  {
    "id": "targets",
    "title": "Compilation Targets",
    "text": "Compilation Targets Compilation Targets Targets describe where QClang output should go. In the final documentation, each target can include exact request/response examples and screenshots. json_ir Structured intermediate representation for debugging and frontend inspection. qiskit_metal Python code intended for quantum chip component generation workflows. spice SPICE-style text for circuit-level representation. exports Project exports such as QClang source, JSON, SVG, GDS, DXF, and reports."
  },
  {
    "id": "chip-synthesis",
    "title": "Chip Synthesis",
    "text": "Chip Synthesis Chip Synthesis Chip synthesis documentation should explain how QClang source becomes a design graph, then goes through placement, frequency planning, routing, DRC, and export generation. 1 Constraints Collect chip size, substrate, topology, metal, and qubit count. 2 Graph Create a design graph with qubits, couplers, readouts, feedlines, and launchpads. 3 Export Return generated artifacts for the user interface and downstream tooling."
  },
  {
    "id": "superconducting-materials",
    "title": "Superconducting Materials",
    "text": "Chip Synthesis Superconducting Materials This page summarizes CDAC_Superconducting_Materials.pptx for QClang documentation. Use it to understand the material families that a superconducting quantum-chip design flow must describe before layout, fabrication, HFSS simulation, Q3D extraction, and EPR/scQubits analysis. Learning goal Superconducting quantum circuits require carefully selected materials across three functional layers: Each slide covers one material: Role · Properties · Critical Temperature · Importance for qubit coherence Superconducting Metals Aluminum (Al), Niobium (Nb), Molybdenum Rhenium (MoRe), and Indium (In). These materials form qubit electrodes, resonators, wiring, and flip-chip interconnects. Superconducting Compounds Titanium Nitride (TiN), Niobium Nitride (NbN), and Niobium Titanium Nitride (NbTiN). These support high kinetic inductance, photon detection, high-Q microwave circuits, and magnetic-field-tolerant designs. Substrates and Barriers Silicon (Si), Sapphire (Al2O3), and Aluminum Oxide (AlOx). These define the chip foundation and the Josephson junction tunnel barrier that creates qubit nonlinearity."
  },
  {
    "id": "material-aluminum-al",
    "title": "Aluminum (Al)",
    "text": "Superconducting Materials Aluminum (Al) The Workhorse of Superconducting Qubits Tc = 1.2 K Aluminum (Al) The Workhorse of Superconducting Qubits Role in quantum circuits Qubit body, Josephson junction electrodes, resonators, coplanar waveguides Why it matters Aluminum's native oxide (AlOx) forms a reproducible ~1–2 nm tunnel barrier for Josephson junctions — the heart of every superconducting qubit. Its long coherence times and CMOS-compatible deposition make it the most widely used qubit material worldwide, adopted by IBM, Google, IQM and in C-DAC's reference facility. Key facts Type I superconductor — minimal trapped flux vortices Naturally forms AlOx tunnel barrier (~1–2 nm thick) Shadow evaporation enables precise Josephson junction fabrication Used by IBM, Google, IQM & adopted in C-DAC reference facility Low decoherence from TLS defects when surface is clean"
  },
  {
    "id": "material-niobium-nb",
    "title": "Niobium (Nb)",
    "text": "Superconducting Materials Niobium (Nb) High-Tc Superconductor for Resonators & Wiring Tc = 9.3 K Niobium (Nb) High-Tc Superconductor for Resonators & Wiring Role in quantum circuits Microwave resonators, transmission lines, ground planes, multi-layer wiring Why it matters Niobium's higher critical temperature gives a wider thermal margin. It is the material of choice for resonators and readout structures in high-qubit-count processors. Sputter-deposited as thin films, it enables scalable multi-layer chip architectures essential for 50–100 qubit systems like those in C-DAC's program. Key facts Type II superconductor — operates well in moderate magnetic fields Widely used in SRF (superconducting radio-frequency) cavities Preferred for multi-layer, high-qubit-count chip stacks Sputter-deposited as thin films on Si or sapphire wafers Critical for scalable quantum processor architectures"
  },
  {
    "id": "material-silicon-si-substrate",
    "title": "Silicon (Si) Substrate",
    "text": "Superconducting Materials Silicon (Si) Substrate The Foundation of Most Quantum Chips Non-superconducting — dielectric substrate Silicon (Si) Substrate The Foundation of Most Quantum Chips Role in quantum circuits Substrate / foundation for depositing superconducting thin films and qubit circuits Why it matters High-resistivity intrinsic silicon is the most common substrate because semiconductor fabrication techniques are directly compatible. It enables patterning of qubits using electron-beam and optical lithography at scale. C-DAC's reference facility uses silicon wafers for double-sided qubit chip fabrication. Key facts Dielectric constant ~11.7; extremely well-characterised Float-zone (intrinsic) Si has very low impurity levels Compatible with standard cleanroom microfabrication tools Loss tangent must be carefully managed at millikelvin temperatures Used in double-sided 3-inch wafer fabrication at C-DAC partner labs"
  },
  {
    "id": "material-sapphire-al2o3-substrate",
    "title": "Sapphire (Al₂O₃) Substrate",
    "text": "Superconducting Materials Sapphire (Al₂O₃) Substrate Ultra-Low-Loss Substrate for High-Coherence Qubits Non-superconducting — crystalline dielectric Sapphire (Al₂O₃) Substrate Ultra-Low-Loss Substrate for High-Coherence Qubits Role in quantum circuits Low-loss substrate for high-coherence qubit circuits; alternative to silicon Why it matters Sapphire offers extremely low dielectric loss and a very clean surface, resulting in longer qubit coherence times (T1, T2). It is used in state-of-the-art processors where maximising coherence is critical. Google's Sycamore processor uses sapphire substrates. Key facts Dielectric constant ~9–10; very low loss tangent Single-crystal c-plane (0001) orientation preferred Cleaner surfaces reduce two-level system (TLS) defects Used in Google's Sycamore and many research-grade qubits globally Higher cost than silicon but delivers superior coherence times"
  },
  {
    "id": "material-titanium-nitride-tin",
    "title": "Titanium Nitride (TiN)",
    "text": "Superconducting Materials Titanium Nitride (TiN) High Kinetic Inductance Superconductor Tc = 4–5.6 K (tunable) Titanium Nitride (TiN) High Kinetic Inductance Superconductor Role in quantum circuits Kinetic inductance detectors (KIDs), high-impedance resonators, superconducting inductors Why it matters TiN has a large kinetic inductance arising from its high normal-state resistivity. This makes it ideal for compact high-impedance resonators and microwave kinetic inductance detectors (MKIDs). Its Tc is tunable by adjusting nitrogen content during reactive sputtering deposition. Key facts High kinetic inductance — enables compact circuit elements Tc tunable via N₂ partial pressure during sputtering deposition Hard, chemically stable coating — easy to pattern by etching Used in microwave kinetic inductance detectors (MKIDs) Studied at C-DAC partner labs for next-generation qubit designs"
  },
  {
    "id": "material-niobium-nitride-nbn",
    "title": "Niobium Nitride (NbN)",
    "text": "Superconducting Materials Niobium Nitride (NbN) High-Tc Nitride for Photon Detection & Qubits Tc = 16 K (bulk); ~10 K thin film Niobium Nitride (NbN) High-Tc Nitride for Photon Detection & Qubits Role in quantum circuits Superconducting nanowire single-photon detectors (SNSPDs), resonators, qubit circuits Why it matters NbN has the highest Tc among common superconducting nitrides and is prized for single-photon detection at near-infrared wavelengths. Its large superconducting gap makes it resistant to quasiparticle poisoning — a key decoherence mechanism in qubit circuits used in quantum networking nodes. Key facts Highest Tc among common nitrides — operable at 4 K with standard cryostats Used in SNSPDs for quantum communication & networking links Large superconducting gap reduces quasiparticle poisoning Deposited by reactive magnetron sputtering on MgO or sapphire Integrated into quantum networking nodes alongside transmon qubits"
  },
  {
    "id": "material-niobium-titanium-nitride-nbtin",
    "title": "Niobium Titanium Nitride (NbTiN)",
    "text": "Superconducting Materials Niobium Titanium Nitride (NbTiN) Optimised Alloy for Low-Loss Microwave Circuits Tc ≈ 15 K Niobium Titanium Nitride (NbTiN) Optimised Alloy for Low-Loss Microwave Circuits Role in quantum circuits High-Q microwave resonators, MKID arrays, qubit coupling elements, SQUIDs Why it matters NbTiN combines the high Tc of NbN with improved thin-film uniformity and magnetic field resilience. It is widely used for microwave resonators requiring both high quality factor (Q) and resilience to in-plane magnetic fields, making it superior for large-scale qubit arrays and flux-tunable designs. Key facts Higher Q resonators compared to plain Nb films Resilient to in-plane magnetic fields — ideal for fluxonium qubits Excellent film uniformity over large (4-inch+) wafers Critical for SQUIDs and superconducting interference devices Adopted in European quantum platforms (QuTech, IQM) and C-DAC partners"
  },
  {
    "id": "material-aluminum-oxide-alox-tunnel-barrier",
    "title": "Aluminum Oxide (AlOx) Tunnel Barrier",
    "text": "Superconducting Materials Aluminum Oxide (AlOx) Tunnel Barrier The Quantum Tunneling Element — Heart of the Josephson Junction Non-superconducting amorphous dielectric (~1–3 nm) Aluminum Oxide (AlOx) Tunnel Barrier The Quantum Tunneling Element — Heart of the Josephson Junction Role in quantum circuits Insulating tunnel barrier in Al/AlOx/Al Josephson junctions — defines qubit nonlinearity Why it matters The AlOx tunnel barrier is the most critical element in superconducting qubits. Formed by controlled thermal oxidation of aluminum, it creates a ~1–2 nm amorphous oxide through which Cooper pairs tunnel, producing the non-linear inductance that makes a qubit distinct from a classical LC oscillator. Key facts Formed by controlled O₂ exposure of Al surface (thermal oxidation) Thickness (~1–2 nm) sets the critical current Ic of the junction Amorphous structure introduces TLS defects — primary decoherence source Shadow-angle evaporation produces self-aligned Josephson junctions Active C-DAC research: cleaner barriers to extend T1 coherence times"
  },
  {
    "id": "material-molybdenum-rhenium-more",
    "title": "Molybdenum Rhenium (MoRe)",
    "text": "Superconducting Materials Molybdenum Rhenium (MoRe) Emerging Alloy for Resilient Qubit Circuits Tc ≈ 9–14 K (varies with Re content) Molybdenum Rhenium (MoRe) Emerging Alloy for Resilient Qubit Circuits Role in quantum circuits Josephson junction electrodes, qubit wiring in magnetic-field-tolerant and hybrid designs Why it matters MoRe alloys offer a tunable Tc and are highly compatible with silicon nanofabrication processes. They are being explored for qubit designs that must tolerate small magnetic fields, including topological qubit experiments using Majorana zero modes in semiconductor-superconductor hybrid systems. Key facts Tc tunable by adjusting the Mo:Re ratio during co-sputtering Compatible with semiconductor (Si) foundry fabrication processes Used in hybrid semiconductor-superconductor qubit devices Explored for Majorana-based topological qubit research (Microsoft) Under evaluation at leading quantum labs and C-DAC ecosystem partners"
  },
  {
    "id": "material-indium-in-bump-bonds",
    "title": "Indium (In) Bump Bonds",
    "text": "Superconducting Materials Indium (In) Bump Bonds Superconducting 3D Integration for Scalable Processors Tc = 3.4 K Indium (In) Bump Bonds Superconducting 3D Integration for Scalable Processors Role in quantum circuits Flip-chip indium bump bonds for 3D multi-chip quantum processor stacking Why it matters Indium is soft and ductile, making it ideal for superconducting bump bonds that connect multiple quantum chips in a 3D flip-chip stack. This technique, pioneered by Google and IBM, enables qubit chips and control chips to be connected with low-loss superconducting contacts, crucial for scaling beyond 100 qubits. Key facts Low melting point (157°C) — compatible with quantum chip processing Soft metal: forms reliable superconducting bump bonds under low pressure Superconducting at 3.4 K — well below qubit operating temperature (~15 mK) Enables scalable 3D quantum processor stacking architectures Evaluated for C-DAC reference facility 50–100 qubit multi-chip modules"
  },
  {
    "id": "materials-summary",
    "title": "Materials Summary",
    "text": "Superconducting Materials Materials Summary Quick comparison table from CDAC_Superconducting_Materials.pptx . Material Type Tc Primary Use Aluminum (Al) Superconductor 1.2 K Qubit body, JJ electrodes Niobium (Nb) Superconductor 9.3 K Resonators, wiring layers Silicon (Si) Substrate — Qubit chip foundation Sapphire (Al₂O₃) Substrate — High-coherence substrate Titanium Nitride (TiN) Compound SC 4–5.6 K High-kinetic-inductance elements Niobium Nitride (NbN) Compound SC 16 K SNSPDs, resonators NbTiN Compound SC 15 K High-Q resonators, SQUIDs AlOx (tunnel barrier) Dielectric — Josephson junction tunnel barrier MoRe alloy Superconductor 9–14 K Hybrid / topological qubits Indium (In) Superconductor 3.4 K 3D flip-chip bump bonds"
  },
  {
    "id": "synthesis-tutorial",
    "title": "Synthesis Tutorial",
    "text": "Synthesis Tutorial Synthesis Tutorial This tutorial outlines the high-level quantum chip synthesis pipeline, including source input parsing, design constraint extraction, graph generation, component routing, and layout export. Future update After the final QClang folder is complete, refer to the compiler configuration and optimization pipeline."
  },
  {
    "id": "hfss-tutorial",
    "title": "HFSS Electromagnetic Simulation",
    "text": "HFSS Tutorial HFSS Electromagnetic Simulation HFSS is a full-wave 3D electromagnetic field solver used to test and analyze RF, microwave, antenna, and superconducting quantum circuit designs before manufacturing. In the QClang documentation, place this tutorial after chip synthesis because the synthesized chip geometry becomes the input for electromagnetic simulation. HFSS tutorial image: superconducting quantum circuit, transmon, resonator, field distribution, and fabrication layers. Why HFSS is needed It predicts device performance before manufacturing, reduces design mistakes, and saves prototype cost. Core method HFSS uses the Finite Element Method to solve Maxwell's equations in complex 3D geometries. Driven Modal Used for antennas, filters, waveguides, S-parameters, field overlays, gain, and radiation patterns. Driven Terminal Used for PCB traces, connectors, cables, voltage/current behavior, impedance, and signal integrity. Eigenmode Finds natural resonant frequencies, cavity modes, waveguide cutoffs, and Q-factors without ports. Results Field plots, S11 reflection, S21 transmission, resonant frequencies, and quantum circuit field behavior. Workflow: geometry, materials, boundaries, mesh, simulation, results. Field visualization used to inspect electromagnetic behavior."
  },
  {
    "id": "q3d-tutorial",
    "title": "Q3D Extractor Analysis",
    "text": "Q3D Analysis Tutorial Q3D Extractor Analysis Q3D analysis belongs after HFSS in the documentation because it explains how a quantum chip layout is converted into electrical interaction values. Q3D helps analyze capacitance, coupling, electric field strength, and unwanted interaction before fabrication. Q3D tutorial image: AEDT interface showing geometry, fields, and extraction workflow. Quantum chip layout: start from qubits, resonators, readout lines, control lines, and ground plane. Import into AEDT: bring the geometry into ANSYS Electronics Desktop. Open Q3D Extractor: analyze electrical interactions between physical structures. Assign materials: apply aluminum, silicon, sapphire, niobium, or project-specific materials. Generate mesh: divide the structure into small elements for calculation accuracy. Calculate fields: inspect electric field strength, direction, and energy concentration. Extract capacitance matrix: convert physical geometry into electrical information. Input layout: qubits, readout lines, control lines, and ground plane. Capacitance matrix: diagonal values are self-capacitance; off-diagonal values show component interaction. How to explain color fields Red or yellow means strong electric field, green means medium field, and blue means weak field."
  },
  {
    "id": "epr-tutorial",
    "title": "EPR Analysis in Superconducting Quantum Circuits",
    "text": "EPR / scQubits Tutorial EPR Analysis in Superconducting Quantum Circuits EPR means Energy Participation Ratio. It explains what percentage of total electromagnetic energy is stored in each circuit component. In QClang documentation, place EPR after HFSS and Q3D because EPR converts field simulation information into quantum parameters such as qubit frequency, anharmonicity, coupling strength, and Kerr effects. Transmon qubit: capacitor plus Josephson junction structure. Josephson junction: two superconductors separated by a thin insulating layer. Field-energy visualization used before participation analysis. Why EPR is needed It predicts qubit behavior before fabrication and reduces trial-and-error design iterations. Energy distribution It shows how energy is shared between capacitor, Josephson junction, resonator, and other modes. HFSS relationship HFSS calculates fields; EPR converts field information into quantum circuit parameters. Parameters obtained Qubit frequency, anharmonicity, coupling strength, Kerr effects, and mode interactions. Industry use Used in superconducting qubit research, academic labs, circuit QED workflows, and scalable chip studies. scQubits placement Use scQubits-style analysis after EM simulation to display Hamiltonian, energy levels, coherence, participation, and interactions."
  },
  {
    "id": "simulation-dashboard",
    "title": "Simulation Dashboard Parameters",
    "text": "Simulation Dashboard Tutorial Simulation Dashboard Parameters This tutorial describes where the simulation screens from the provided images should live. In the final QClang documentation, add screenshots here showing HFSS eigenmode simulation, model tree, material layers, object properties, field visualization, mesh settings, and progress status. HFSS Eigenmode Simulation Document the 3D model view, setup tabs, logs, results, files, progress bar, and solver status. Model Tree Explain substrate, metal layers, qubits, couplers, readout resonators, flux lines, ports, boundaries, and excitations. Field Visualization Show E-field plots, color legends, frequency selection, vector display, cross section, and measurements. Simulation List Document total simulations, running/completed/failed counts, filters, rows, side preview, and export actions."
  },
  {
    "id": "results-reports",
    "title": "Results, Verification, and Reports",
    "text": "Results and Reports Tutorial Results, Verification, and Reports Place final result screenshots here. This page should explain how users read simulation outputs after HFSS and EPR/scQubits analysis: qubit frequency distribution, energy levels, coupling maps, coherence summary, verification status, artifacts, and downloadable reports. Summary metrics Total qubits, average qubit frequency, anharmonicity, T1, T2, coherence, gates, and status. Qubit table Frequency, anharmonicity, T1, T2, coherence, participation ratio, and pass/fail status. Physics plots Frequency histogram, coupling map, energy levels, Hamiltonian summary, and performance estimates. Verification summary Design rule, frequency, coupling, coherence, fabrication, and custom checks. Artifacts HFSS results, scQubits results, capacitance matrix, Hamiltonian data, and PDF reports. Reports Generate and download complete analysis reports after final simulation completion."
  },
  {
    "id": "execution-part-1",
    "title": "Execution Tutorial - Part 1",
    "text": "Execution Tutorial Execution Tutorial - Part 1 This page explains the first execution stage for QClang documentation users. After a QClang file is written and checked by the compiler, the design should be exported into simulation-ready artifacts such as JSON IR, geometry data, or electromagnetic setup files. Input A validated .qcl chip description with qubits, resonators, couplers, ports, and constraints. Compiler output Structured intermediate representation and design artifacts that simulation tools can consume. Simulation handoff Use this stage before HFSS, Q3D, and EPR analysis pages. User goal Confirm that the design intent is converted into a usable simulation workflow."
  },
  {
    "id": "execution-part-2",
    "title": "Execution Tutorial - Part 2",
    "text": "Execution Tutorial Execution Tutorial - Part 2 This page explains the second execution stage: reading simulation outputs and connecting them back to QClang design decisions. Users should compare HFSS, Q3D, and EPR/scQubits values against the result-analysis tables. HFSS review Check S-parameters, resonator response, field concentration, crosstalk, and convergence. Q3D review Check extracted capacitance, coupling, coherence-related thresholds, yield, and system quality. EPR review Check participation ratios, Hamiltonian parameters, loss channels, qubit metrics, and scQubits outputs. Final decision Use the analysis pages to decide whether the QClang design is ready, marginal, or needs redesign."
  },
  {
    "id": "hfss-results-analysis",
    "title": "HFSS Results Analysis",
    "text": "Results Analysis HFSS Results Analysis HFSS results explain how the QClang-generated chip behaves electromagnetically. This page has been updated from HFSS_Quantum_Parameters (1).pptx and grouped so learners can study one simulation category at a time. Quantum Computing — SilicoFeller Format 52 Parameters 7 Categories 26 Critical Sources: IEEE / APS Research Papers & Doctoral Theses (2004–2024) HFSS Simulation Output Parameters 52 parameters grouped into 7 categories S-Parameters & RF Performance RF checks for matching, transmission, isolation, coupling, phase response, and standing-wave behavior. # VER ID Parameter Severity Design Rule / Constraint Ideal / Optimal Value Acceptable Range Good Bad Why It Matters 1 HFSS-S-001 Return Loss Critical S11 ≤ −20 dB at operating frequency −15 to −25 dB > −10 dB: >10% power reflected; readout chain SNR degraded Reflected power from input port. Poor return loss = impedance mismatch → signal reflections degrade qubit readout fidelity. 2 HFSS-S-002 Insertion Loss Critical S21 ≥ −0.1 dB in passband −0.1 to −1 dB > −3 dB: half power lost; readout SNR Signal transmission efficiency. High insertion loss reduces readout SNR, requiring higher drive power that heats the device. 3 HFSS-S-003 Transmission |S21| High |S21| ≥ 0.95 (linear) in passband ≈ 1.0 (unity) 0.9 – 1.0 ≥ 0.95: >90% amplitude transmission; strong coupling confirmed 50% amplitude loss; readout inefficient Linear magnitude of S21. Near-unity confirms full coupling efficiency; used in EPR extraction and resonator characterisation. 4 HFSS-S-004 Port Isolation High Sij ≤ −30 dB between non-coupled ports −20 to −40 dB > −15 dB: strong port coupling; driven rotations on idle qubits Cross-port electromagnetic isolation. Insufficient isolation causes simultaneous readout errors and qubit–qubit cross-drive. 5 HFSS-S-005 Forward Isolation (S12) High S12 ≤ −20 dB (Purcell filter context) −15 to −30 dB > −10 dB: HEMT noise reaches qubit; excess excitation and T₁ degradation Reverse isolation prevents HEMT amplifier noise photons from reaching qubit. Critical in Purcell filter and circulator design. 6 HFSS-S-006 Phase of S21 (GDD) Medium Group delay deviation Linear phase Linear phase: negligible pulse distortion; gate calibration stable Non-linear phase: pulse distortion → systematic gate errors Non-linear phase response causes group delay dispersion that distorts shaped control pulses, increasing gate error. 7 HFSS-S-007 Coupling Coefficient κ Critical 1 MHz ≤ κ/2π ≤ 10 MHz (readout resonator) 1 – 5 MHz 0.5 – 20 MHz 1–5 MHz: fast readout ( 10 µs; > 100 MHz: Purcell collapse of T₁ External coupling rate of readout resonator. Sets fundamental trade-off between measurement speed and Purcell-induced qubit decay. 8 HFSS-S-008 VSWR Medium VSWR ≤ 1.1 : 1 at operating frequency 1.1 – 1.5 : 1 99% power transfer; standing waves negligible > 2.0:1: standing waves cause frequency-dependent errors Voltage standing wave ratio quantifies impedance mismatch. High VSWR degrades power delivery to qubit and readout resonator. Resonator & Cavity Parameters Resonator and cavity checks that control readout speed, coupling, Q factors, impedance, and frequency placement. # VER ID Parameter Severity Design Rule / Constraint Ideal / Optimal Value Acceptable Range Good Bad Why It Matters 9 HFSS-R-001 Resonant Frequency f₀ Critical 4.0 GHz ≤ f₀ ≤ 8.0 GHz; detuned ≥ 300 MHz from qubit 5 – 7 GHz 4 – 8 GHz 5–7 GHz: low thermal photon occupancy; standard coax hardware 15 GHz: lossy substrate Resonator frequency sets readout photon energy, hardware requirements, and Purcell rate via qubit–resonator detuning. 10 HFSS-R-002 Loaded Q (Q_L) Critical Q_L ~ 5,000–20,000 (readout); > 10⁶ (memory) 5,000 – 20,000 1,000 – 50,000 5k–20k: readout BW 250–1000 kHz; fast measurement with acceptable Purcell 10⁶ readout: extremely slow Loaded Q determines readout bandwidth κ = ω₀/Q_L. Governs measurement time and Purcell-limited qubit T₁. 11 HFSS-R-003 Internal Q (Q_i) Critical Q_i ≥ 10⁵ (2D planar); ≥ 10⁷ (3D cavity) > 10⁶ 10⁵ – 10⁷ > 10⁶: resonator loss Internal Q reflects intrinsic material, TLS, and vortex losses in resonator walls. Sets upper limit on qubit T₁ via Purcell. 12 HFSS-R-004 External Q (Q_e) High Q_e ~ 2,000 – 50,000 (readout) 2,000 – 20,000 500 – 100,000 2k–20k: controllable readout rate; Purcell rate 10⁶: under-coupled External Q sets coupling to transmission line. With Q_i >> Q_e (over-coupled), resonator is readout-limited not loss-limited. 13 HFSS-R-005 Coupling Strength g Critical 50 MHz ≤ g/2π ≤ 200 MHz (strong coupling) 50 – 150 MHz 10 – 300 MHz 50–150 MHz: well in strong coupling; g/κ > 10 and g/γ > 10 confirmed Qubit–resonator coupling. Strong coupling (g >> κ, γ) is fundamental requirement for circuit QED dispersive readout. 14 HFSS-R-006 Dispersive Shift χ Critical 0.5 MHz ≤ |χ|/2π ≤ 10 MHz 1 – 5 MHz 0.1 – 20 MHz 1–5 MHz: large IQ-plane separation; high-fidelity single-shot readout 50 MHz: photon-induced dephasing State-dependent resonator frequency shift enables QND readout. χ = g²/Δ sets IQ-plane angle; drives single-shot fidelity. 15 HFSS-R-007 Photon Decay Rate κ High κ/2π = 1 – 5 MHz (readout resonator) 1 – 5 MHz 0.1 – 20 MHz 1–5 MHz: readout ring-up/ring-down time ~100–500 ns; compatible with 1 µs cycles 100 MHz: broad resonator; Purcell collapse Resonator energy decay rate sets readout speed. Too small → slow readout; too large → Purcell-limited T₁. 16 HFSS-R-008 Impedance Z₀ Medium Z₀ = 50 Ω ± 2 Ω (matched to coax) 50 Ω 45 – 55 Ω 50 Ω ± 1 Ω: VSWR 100 Ω: VSWR > 2; large reflections; effective κ shifts from design Characteristic impedance matching to 50 Ω coaxial environment. Mismatch reduces coupling efficiency and shifts κ from design. 17 HFSS-R-009 Frequency Pulling Δf Medium Δf > 5 MHz: readout tone off-resonance; SNR degraded; tone calibration required Frequency shift due to coupling, fabrication tolerances, or dielectric loading. Excess pulling requires per-device calibration. 18 HFSS-R-010 Kinetic Inductance α Low 0.01 ≤ α ≤ 0.3 for standard Al/Nb resonators 0.05 – 0.2 0.001 – 0.5 0.05–0.2: moderate nonlinearity; resonator frequency stable vs power > 0.8: strong nonlinearity; resonator bifurcates at readout photon numbers Kinetic inductance fraction α = L_k/(L_k+L_geo). Controls resonator nonlinearity, power handling, and anharmonicity contribution. Electromagnetic Field Outputs Field-solution checks for peak fields, surface/interface participation, EPR participation, and radiation quality. # VER ID Parameter Severity Design Rule / Constraint Ideal / Optimal Value Acceptable Range Good Bad Why It Matters 19 HFSS-E-001 Peak E-Field |E|max High |E|max > 10⁸ V/m: dielectric breakdown risk; TLS saturation Peak E-field at Josephson junction. High fields excite TLS defects in AlOx barrier and substrate, directly increasing T₁⁻¹. 20 HFSS-E-002 H-Field Distribution |H| Medium |H| > 10⁵ A/m: vortex trapping in SC film; each vortex adds ~1 kHz to κ H-field concentration at superconductor surface. Hotspots exceed H_c1 locally, nucleating Abrikosov vortices that add loss. 21 HFSS-E-003 Interface Participation pᵢ Critical p_SA 10⁻³ – 10⁻² 1 ms achievable > 10⁻¹: interface dominates all loss channels; T₁ Fraction of electric field energy at lossy interface. pᵢ × tan δᵢ × ω = loss rate. Dominant predictor of TLS-limited T₁. 22 HFSS-E-004 Surface Participation p_MA Critical p_MA (metal–air) 10⁻⁴ – 10⁻³ 500 µs > 10⁻²: native oxide (AlOx) TLS dominates decay; T₁ Energy stored in metal–air (native oxide) interface. Key TLS loss channel in Al transmons; reduced by surface treatment. 23 HFSS-E-005 Bulk Participation p_bulk High p_bulk 10⁻² – 5×10⁻² > 0.1: bulk dominates; even ultra-pure Si limits T₁ Energy fraction in bulk substrate dielectric. Multiplied by tan δ gives bulk T₁ contribution. Minimised by geometry. 24 HFSS-E-006 EPR (Junction EPR) Critical Junction EPR ≥ 0.9 for dominant mode 0.95 – 1.0 0.8 – 1.0 0.95–1.0: junction hosts >95% inductive energy; anharmonicity and χ predicted accurately Fraction of inductive energy in Josephson junction vs total. Drives EPR method for extracting dispersive shifts and decay rates. 25 HFSS-E-007 Radiation Q (Q_rad) High Q_rad ≥ 10⁶ for on-chip resonators (shielded) > 10⁶ > 10⁵ > 10⁶: radiation loss Quality factor limited by power radiated from chip. Poor shielding or slot-line modes radiate energy, reducing Q_i and T₁. Qubit Performance Metrics HFSS-derived qubit checks for frequency, anharmonicity, energy scales, coherence, Purcell decay, and gate fidelity. # VER ID Parameter Severity Design Rule / Constraint Ideal / Optimal Value Acceptable Range Good Bad Why It Matters 26 HFSS-Q-001 Anharmonicity α Critical |α|/2π ≥ 150 MHz (|α| = |ω₁₂ − ω₀₁|) −200 to −300 MHz −100 to −500 MHz |α| 200–300 MHz: DRAG gates |α| 200 ns; leakage to |2⟩ > 1% Frequency gap between 0→1 and 1→2 transitions. Must exceed pulse bandwidth for selective driving without leakage. 27 HFSS-Q-002 Qubit Frequency f_q Critical 4.0 GHz ≤ f_q ≤ 6.0 GHz (transmon sweet spot) 4 – 6 GHz 3 – 8 GHz 4–6 GHz: kT/hf 1%; > 10 GHz: substrate loss increases Qubit transition frequency. Must be well above thermal energy (kT/h ≈ 400 MHz at 20 mK) and away from substrate TLS resonances. 28 HFSS-Q-003 Josephson Energy E_J Critical 10 GHz ≤ E_J/h ≤ 40 GHz; E_J/E_C ≥ 50 15 – 30 GHz 5 – 60 GHz 15–30 GHz: f_q on target; charge insensitive; junction reproducible within ±5% Josephson tunneling energy sets qubit frequency and E_J/E_C ratio. Extracted in HFSS via junction inductance L_J = Φ₀²/E_J. 29 HFSS-Q-004 Charging Energy E_C Critical 200 MHz ≤ E_C/h ≤ 350 MHz 200 – 350 MHz 100 – 500 MHz 200–350 MHz: anharmonicity ~−E_C; charge noise suppressed; qubit addressable 1000 MHz: Cooper-pair box regime Single-electron charging energy set by shunt capacitance. E_C = e²/2C_Σ; defines anharmonicity and charge sensitivity. 30 HFSS-Q-005 Purcell Decay Rate γ_P Critical γ_P/2π 2 ms; does not limit qubit T₁ budget > 100 kHz: Purcell T₁ Qubit decay rate into transmission line via off-resonant resonator. γ_P = (g/Δ)²κ. Limits T₁ without Purcell filter. 31 HFSS-Q-006 Predicted T₁ Critical T₁ > 100 µs (planar 2D); > 1 ms (3D cavity) > 500 µs (3D) / > 100 µs (2D) 50 – 500 µs > 100 µs: supports > 1000 gate depth within coherence envelope (10 ns gates) Predicted energy relaxation time from HFSS loss model: 1/T₁ = Σ(pᵢ × ωᵢ × tan δᵢ) + γ_Purcell + γ_radiation. 32 HFSS-Q-007 Predicted T₂ Critical T₂ > 50 µs; ideally T₂ ≈ 2T₁ (pure dephasing limited) > 100 µs 20 – 300 µs T₂ ≈ 2T₁: pure dephasing negligible; charge and flux noise well-suppressed T₂ ≪ T₁: strong 1/f dephasing; substrate charge traps or flux noise dominant Pure dephasing time. Gap between T₂ and 2T₁ quantifies 1/f noise from TLS charge noise and flux noise in junctions. 33 HFSS-Q-008 1Q Gate Fidelity F₁Q Critical F₁Q ≥ 99.9% (randomised benchmarking) > 99.9 % 99 – 99.99 % > 99.9%: below surface-code fault-tolerance threshold (~99.4%); QEC viable Single-qubit gate fidelity estimated from T₁, T₂, anharmonicity, and leakage. Must exceed fault-tolerant threshold ~99.5%. 34 HFSS-Q-009 2Q Gate Fidelity F₂Q Critical F₂Q ≥ 99.5% (CZ or iSWAP gate) > 99.5 % 98 – 99.9 % > 99.5%: viable for surface code with standard overhead; ZZ residual Two-qubit gate fidelity. More sensitive to residual ZZ coupling, leakage, coupler calibration, and neighbouring qubit crosstalk. Crosstalk & Isolation Checks for always-on ZZ, neighbour isolation, leakage, package modes, and unintended electromagnetic coupling. # VER ID Parameter Severity Design Rule / Constraint Ideal / Optimal Value Acceptable Range Good Bad Why It Matters 35 HFSS-C-001 ZZ Coupling ζ (idle) Critical ζ_ZZ/2π 1 – 100 kHz > 1 MHz: > 1 rad conditional phase per µs; circuit depth severely limited Always-on ZZ interaction from dispersive coupling. Even static ZZ causes phase errors that accumulate, limiting circuit depth. 36 HFSS-C-002 Nearest Neighbour Isolation High S_ij (nearest neighbour) ≤ −40 dB −30 to −50 dB > −20 dB: significant driven rotation on neighbours; simultaneous single-qubit gates not independent EM isolation between nearest-neighbour qubits. Insufficient isolation causes unwanted rotations during single-qubit gates. 37 HFSS-C-003 Next-Nearest Isolation High S_ij (next-nearest) ≤ −60 dB −50 to −70 dB > −40 dB: long-range coupling; frequency collisions compound with nearest-neighbour Isolation beyond nearest neighbour. Critical for scalable multi-qubit processors; long-range EM leakage compounds errors. 38 HFSS-C-004 Leakage to |2⟩ (L₁) Critical L₁ 0.01 – 0.1 % > 1%: leakage accumulates over circuit; error correction cannot track non-qubit states Population leaked to |2⟩ non-computational state during gates. DRAG pulses mitigate but require sufficient anharmonicity. 39 HFSS-C-005 Spurious Mode Gap Δf_spur High Δf_spur ≥ 1 GHz from nearest spurious EM mode > 1 GHz gap 0.5 – 2 GHz gap > 1 GHz gap: no spurious mode within pulse bandwidth; gate calibration stable Frequency distance to nearest unintended EM mode. Modes within drive bandwidth cause state leakage and gate calibration drift. 40 HFSS-C-006 Package Mode Density Medium > 10/GHz: dense mode spectrum; unavoidable hybridisation; package must be redesigned Density of package/enclosure modes near qubit frequency. High density increases probability of accidental mode hybridisation. Thermal & Loss Parameters Loss and thermal checks for dielectric, conductor, substrate, TLS, radiation, and package-related dissipation. # VER ID Parameter Severity Design Rule / Constraint Ideal / Optimal Value Acceptable Range Good Bad Why It Matters 41 HFSS-T-001 Dielectric Loss Tangent Critical tan δ 10⁻⁷ – 10⁻⁵ 10⁶ > 10⁻³ (SiO₂, organics): dielectric loss dominates; T₁ Bulk dielectric loss factor. Mandates high-resistivity Si or c-plane sapphire; amorphous oxides and organics are lossy. 42 HFSS-T-002 Surface Resistance Rs High Rs 0.001 – 0.1 mΩ/□ 10⁶ > 1 mΩ/□: residual normal-metal loss or vortex contribution; Q_i Microwave surface resistance of superconducting film. Residual Rs from vortices, normal-metal inclusions, or granularity limits Q_i. 43 HFSS-T-003 Dissipated Power P_sub High P_sub 0.1 – 100 pW > 1 nW: significant quasiparticle poisoning; T₁ collapses in µs timescale Power deposited in substrate at millikelvin temperatures. Excess heating raises quasiparticle population, reducing T₁. 44 HFSS-T-004 Thermal NEP Medium NEP 10⁻²⁰ – 10⁻¹⁸ > 10⁻¹⁶: near-classical noise floor; qubit excited multiple times per measurement cycle Thermal noise equivalent power at qubit frequency. Drives spurious qubit excitation and sets fundamental measurement noise floor. 45 HFSS-T-005 TLS Loss Rate 1/T₁_TLS Critical 1/T₁_TLS 0.5 – 10 kHz 2 ms; not limiting coherence budget > 100 kHz: TLS dominates all other T₁ channels; requires redesign Decay rate contribution from two-level system defects at metal–substrate, metal–air, and substrate–air interfaces. 46 HFSS-T-006 Conductor Loss α_c Medium α_c 0.0001 – 0.1 dB/m > 1 dB/m: conductor loss dominates; normal-metal sections or damaged SC film Ohmic attenuation per unit length. Negligible in good superconductors far below Tc; dominant in normal metal or granular films. 47 HFSS-T-007 Package Radiation Loss 1/Q_rad High 1/Q_rad 10⁻⁷ – 10⁻⁵ 10⁷; package does not limit resonator or qubit Q > 10⁻⁴: radiation loss comparable to TLS loss; package seams/vias must be redesigned Inverse radiation Q. Power fraction radiated from chip to environment via package seams, slots, and via fields. Simulation Convergence Metrics Numerical-quality checks for adaptive passes, mesh size, energy error, S-parameter convergence, and RAM use. # VER ID Parameter Severity Design Rule / Constraint Ideal / Optimal Value Acceptable Range Good Bad Why It Matters 48 HFSS-V-001 Delta S Convergence (ΔS) Critical ΔS 0.001 – 0.005 > 0.01: S-parameters still shifting; Q and coupling coefficients unreliable Primary HFSS convergence criterion. Maximum change in S-parameter matrix between successive adaptive mesh refinement passes. 49 HFSS-V-002 Adaptive Pass Count Medium Converge within 6 – 15 adaptive passes 6 – 12 passes 6 – 25 passes 6–12 passes: efficient meshing; geometry well-suited to HFSS basis functions > 40 passes without convergence: poorly conditioned geometry or material error; abort and review Number of mesh refinement iterations to reach ΔS criterion. Many passes indicates difficult geometry or incorrect material setup. 50 HFSS-V-003 Mesh Element Count Medium 10,000 – 500,000 tetrahedra for typical qubit geometry 20k – 100k 10k – 500k 20k–100k: sufficient resolution for junction, pad, and resonator without excessive RAM > 1,000,000: direct solver RAM > 256 GB; iterative solver with lower accuracy required Total finite-element mesh size. Under-meshed → inaccurate fields; over-meshed → excessive compute cost and RAM. 51 HFSS-V-004 Energy Error Δε/ε High Energy error 0.2 – 1 % > 2%: field solution inaccurate; EPR and loss calculations may be off by > 10% Relative error in total stored electromagnetic energy. Low energy error confirms accurate field solutions and Q-factor extraction. 52 HFSS-V-005 Simulation RAM Usage Low Peak RAM 16 – 64 GB > 128 GB: requires HPC cluster; iterative solver fallback; convergence harder RAM required for direct matrix solver. Excess forces iterative solver with lower accuracy and convergence risk. HFSS Summary Use this as the quick overview of HFSS severity and category coverage. 25 Critical 15 High 10 Medium 2 Low S-Parameters & RF Performance 8 params · 3 critical Resonator & Cavity Parameters 10 params · 5 critical Electromagnetic Field Outputs 7 params · 3 critical Qubit Performance Metrics 9 params · 9 critical Crosstalk & Isolation 6 params · 2 critical Thermal & Loss Parameters 7 params · 2 critical Simulation Convergence Metrics 5 params · 1 critical"
  },
  {
    "id": "q3d-results-analysis",
    "title": "Q3D Results Analysis",
    "text": "Results Analysis Q3D Results Analysis Q3D results explain the RLGC matrices, parasitic extraction values, and derived qubit metrics used after QClang creates superconducting chip geometry. This page has been updated from Q3D_Parameters_Corrected.pptx . 58 parameters The corrected PPT covers 58 Q3D output parameters. 11 categories Each category is kept as a left-sidebar subtopic and a readable documentation table. Matrix foundation Resistance, inductance, conductance, and capacitance matrices are the base Q3D outputs. Design loop Use Q3D matrices to derive Ec, Ej, g, χ, ζ, and Purcell-rate checks for QClang layouts. Q3D Corrected Parameters 58 corrected parameters grouped into 11 categories Resistance Matrix (R) Resistance outputs describe DC and AC conductor losses. For superconducting layouts, use these values as fabrication and normal-state quality checks before low-temperature correction. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 1 DC Self-Resistance (R_ii) R_ii / mΩ DC sweep; sheet-resistance extraction 0.5 – 5 mΩ 0.5 – 5 mΩ > 50 mΩ Ohmic loss in qubit loop raises thermal noise floor and damps resonator Q factor Al becomes superconducting at 4K → R→0; use RₙA as fabrication quality proxy 2 AC Self-Resistance at 5–6 GHz R_ac / mΩ HFSS/Q3D surface impedance model 2 – 20 mΩ 5 – 20 mΩ > 100 mΩ Values shown apply to normal-metal (room-temp) modeling; at cryogenic temp Al is superconducting (R→0). For non-SC segments or pre-cooldown checks, normal-metal losses degrade quality factor Q. Skin effect sets frequency dependence: R_ac ∝ √f for bulk, ≈ R_dc for thin film 3 Mutual Resistance (R_ij) R_ij / μΩ Full R matrix extraction in Q3D ≈ 0 (no shared current path) > 500 μΩ Shared resistive coupling between conductors indicates galvanic crosstalk Non-zero R_ij reveals overlapping ground return paths; fix by isolating ground planes 4 Contact / Via Resistance R_via / mΩ TDR or DC 4-probe; Q3D via model 1 – 5 mΩ > 20 mΩ Resistance at layer transitions limits Q in 3D integration and flip-chip assemblies Critical for multi-chip modules; oxidation or poor metal contact is the main failure mode 5 Ground Plane Sheet Resistance R_sh / mΩ/sq 4-probe measurement; Q3D bulk conductivity input 0.1 – 0.5 mΩ/sq > 5 mΩ/sq High R_sh creates inductive ground return paths and shifts mode frequencies across the chip Perforated ground planes for vortex pinning add ~5–10 pH/sq inductance per square Inductance Matrix (L) Inductance outputs connect geometry, kinetic inductance, mutual inductance, and Josephson energy used in qubit Hamiltonian extraction. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 6 Self-Inductance (L_ii) L_ii / nH Q3D magnetoquasistatic solver; pyEPR energy participation 0.5 – 5 nH 1 – 3 nH (target Ej/Ec ~ 50–80) 0.5 – 5 nH 20 nH Sets Josephson energy Ej = Φ₀²/2L; directly determines qubit frequency f ≈ √(8EjEc)/h L = L_geometric + L_kinetic; kinetic inductance is material-dependent (Al: ~0.1–1 pH/sq) 7 Mutual Inductance (M_ij) M_ij / pH Q3D off-diagonal L matrix extraction 1 – 50 pH 5 – 50 pH > 500 pH Magnetically coupled flux between loops drives parasitic ZZ interaction and inductive crosstalk Intentional M_ij used in flux-tunable couplers; unintentional M_ij sets residual ZZ floor 8 Geometric Inductance L_geo / pH/μm Q3D partial inductance extraction (PEEC) 0.3 – 0.8 pH/μm 0.5 – 1 pH/μm > 2 pH/μm Inductance from current path geometry adds to kinetic inductance to set total L and mode freq Slot cuts in ground plane drastically increase L_geo; continuous ground plane is preferred 9 Kinetic Inductance (L_k) L_k / pH/sq Microwave resonator fitting; L_k = ℏ²/(π Δ e² n_s t) 1–2 pH/sq (Al, 100–200 nm); 30–200 pH/sq (NbTiN) 1 – 10 pH/sq > 100 pH/sq (non-KI devices) Inertia of Cooper pairs; provides non-linearity in KI qubits; adds to geometric L in CPW High-L_k materials (NbTiN, TiN, NbN) used deliberately for kinetic inductance qubit designs 10 Josephson Inductance (L_J) L_J / nH Derived: L_J = Φ₀/(2π I_c) = Φ₀²/(2Ej); I_c from RₙA measurement 5 – 15 nH 8 – 12 nH (Ej/Ec ~ 50–80) 5 – 20 nH 50 nH Non-linear inductance of JJ; L_J(φ) = L_J0/cos(φ) provides essential quantum non-linearity L_J is the ONLY non-linear element; its ratio to shunting capacitance sets anharmonicity α Conductance Matrix (G) Conductance outputs describe leakage paths, dielectric loss, and shunt conductance that can reduce resonator Q and qubit coherence. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 11 Self-Conductance (G_ii) G_ii / nS Q3D DC conductance solve 0.1 – 1 nS > 10 nS Leakage current to ground through substrate limits resonator quality factor directly G_ii = 1/R_leak; appears as parallel resistance Q = ω_r C_r / G in resonator model 12 Substrate Bulk Conductance G_bulk / nS Resistivity measurement + Q3D G matrix 10 kΩcm Si at 4K) 0.01 – 0.5 nS > 5 nS Low-resistivity Si drastically degrades resonator Q; bulk conductance is the dominant channel Use high-resistivity Si (> 10 kΩcm) or sapphire; resistivity increases >100× when cooled to 4K (carrier freeze-out; magnitude is strongly doping-dependent) 13 Surface / Interface Conductance G_surf / nS/μm Surface participation ratio + loss tangent fitting 0.001 – 0.05 nS/μm > 0.1 nS/μm Conductance along metal-air or metal-substrate interfaces is a major T₁ limitation via TLS Adsorbed water and organic residues increase G_surf; HF dip and N₂ purge before cooldown helps 14 Mutual Conductance (G_ij) G_ij / pS Q3D off-diagonal G matrix extraction 1 – 50 pS > 500 pS Leakage coupling between signal conductors via substrate surface conduction channels Non-zero G_ij in presence of surface water or conductive substrate; fixed by surface clean or guard rings Capacitance Matrix (C) Capacitance outputs are the main Q3D bridge into transmon energy, coupling, detuning, and readout design. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 15 Qubit Self-Capacitance (C_Σ) C_Σ / fF Q3D electrostatic solve; Maxwell capacitance matrix 60 – 100 fF 60 – 100 fF (transmon shunting) 40 – 200 fF 500 fF Sets charging energy Ec = e²/2C_Σ; large C_Σ → transmon regime → exponentially reduced charge noise C_Σ = Σ|C_ij| from Maxwell matrix; target Ej/Ec = 50–80 for optimal transmon performance 16 Readout Resonator Capacitance (C_r) C_r / fF Q3D capacitance matrix + HFSS eigenmode simulation 200 – 500 fF 200 – 500 fF (λ/4 CPW) 100 – 600 fF 1 pF Resonator mode capacitance sets frequency: ω_r = 1/√(L_r C_r); must target 6.5–8 GHz window Combined with Q_ext sets readout bandwidth κ = ω_r/Q_ext; trade-off between speed and SNR 17 Qubit–Resonator Coupling Cap (C_g) C_g / fF Q3D Maxwell matrix off-diagonal C_12 between qubit island and resonator 1 – 10 fF 1 – 10 fF (dispersive limit) 0.5 – 15 fF 50 fF Sets coupling g = C_g/(2C_Σ)·√(ω_q ω_r/L_r C_r); must stay dispersive (g ≪ qubit–resonator detuning) g/2π target 50–150 MHz; too large → strong coupling regime; Purcell decay ∝ (g/Δ)² × κ 18 Qubit–Qubit Coupling Cap (C_J) C_J / fF Q3D full capacitance matrix between qubit islands 0.5 – 5 fF 0.5 – 5 fF (tunable coupler) 0.2 – 10 fF 30 fF Drives direct transverse coupling J; residual C_J causes always-on ZZ unless tunable coupler used Modern heavy-hex lattice uses tunable couplers to cancel residual ZZ to 19 Pad-to-Ground Parasitic Cap C_pad / fF Q3D with ground plane mesh 1 – 20 fF > 50 fF Unintended pad-to-ground capacitance shifts qubit frequency from design target Each 1 fF of parasitic shifts f_qubit by ~10–30 MHz; critical to include in Hamiltonian model 20 Trace Mutual Capacitance (C_ij) C_ij / fF Q3D electrostatic solve off-diagonal extraction 1 – 5 fF > 20 fF Capacitive coupling between control lines causes microwave crosstalk in drive and readout paths Overlapping traces on adjacent layers is the primary source; add ground shield layer to suppress Parasitic Resistance Parasitic resistance checks identify unwanted ohmic paths, contacts, vias, and interconnect losses before superconducting operation. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 21 Series JJ Parasitic Resistance R_ser / Ω RF impedance spectroscopy; Q3D lead model 0.01 – 0.1 Ω > 1 Ω Quasiparticle conductance in JJ leads causes T₁ decay via Ohmic dissipation in qubit circuit Quasiparticle poisoning (stray radiation) transiently raises R_ser; shielding critical at mK 22 Shunt Parasitic Resistance (R_p) R_p / kΩ Q3D G matrix → R_p = 1/G_ii > 1 MΩ > 1 MΩ (effectively open) 100 kΩ – 1 MΩ Parallel leakage path across qubit capacitor reduces effective Q = R_p·√(C/L) Substrate residues from lithography are the most common cause; requires thorough O₂ plasma clean 23 Wirebond / Bump Resistance R_wb / mΩ 4-probe TDR; Q3D bond-wire cylinder model 2 – 20 mΩ > 100 mΩ Parasitic series resistance contributes to insertion loss and thermal noise at 4K Au–Au thermo-compression bonds have lower and more repeatable R_wb than Al wedge bonds 24 Metal Interface Contact Resistance R_c / mΩ TLM structure measurement; Q3D metal stack 1 – 10 mΩ > 50 mΩ Interface resistance at Al–Au and Al–Nb transitions is critical in 3D integration Native Al₂O₃ (2–4 nm) must be removed by Ar ion milling before deposition for low R_c Parasitic Inductance Parasitic inductance checks identify wirebond, via, loop, and package effects that shift mode frequencies and add crosstalk. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 25 Wirebond / Bump Inductance L_wb / nH Q3D wire cylinder model; HFSS S-parameter fitting 0.5 – 2 nH per bond 0.3 – 3 nH > 5 nH Series inductance in signal path creates impedance discontinuity; resonates near operating freq Flip-chip indium bumps reduce L_wb to ~0.1 nH vs 1–2 nH for wirebonds; key for 3D scaling 26 Control Line Lead Inductance L_lead / pH Q3D PEEC; partial inductance extraction 50 – 500 pH > 2 nH Lead inductance in flux/charge bias lines causes AC flux errors and qubit frequency shifts Long coax from room-temperature electronics adds 1–10 nH; de-embed by careful calibration 27 Ground Plane Slot Inductance L_slot / pH/sq Q3D mesh simulation of ground plane geometry 1 – 5 pH/sq > 20 pH/sq Inductance from ground return path gaps distorts mode frequencies across the chip Vortex-pinning holes (diameter ~ 1 μm, pitch ~ 2 μm) add ~5–10 pH/sq but are necessary at B > 0 28 Package / Board Parasitic Inductance L_pkg / nH HFSS full package model + Q3D trace extraction 0.5 – 2 nH > 5 nH Package inductance shifts resonator input impedance; must be de-embedded from measurement Surface-mount SMP connectors ( Parasitic Capacitance Parasitic capacitance checks reveal unwanted coupling paths, loading, frequency shifts, and edge-field concentration. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 29 Trace-to-Ground Parasitic Cap C_trace / fF/μm Q3D electrostatic solve per-unit-length 0.1 – 0.4 fF/μm 0.1 – 0.4 fF/μm (50 Ω CPW) 0.1 – 1 fF/μm > 3 fF/μm Distributed capacitance sets CPW characteristic impedance Z₀ = √(L/C); target 50 Ω C' depends on gap width and substrate thickness; narrowing the gap increases C' (lowers Z₀) 30 Pad-to-Substrate Parasitic Cap C_sub / fF Q3D C matrix with substrate dielectric stack 5 – 30 fF > 100 fF Substrate capacitance creates parasitic shunt path reducing resonator Q and shifting qubit freq Thinning substrate from 500 μm to 200 μm reduces C_sub by ~2.5×; used in IBM 3D chip stacks 31 Inter-Layer Cap (3D integration) C_layer / fF Q3D 3D stack model; bump height geometry sweep 1 – 20 fF > 50 fF Capacitance between chip layers through indium/SnAg bumps must be included in Hamiltonian Bump height variation (σ ~ 1–2 μm) causes C_layer spread of ~0.5–1 fF; matters at scale 32 Fringe Capacitance (gap edges) C_fringe / fF/μm Q3D conformal mesh at conductor edges 0.02 – 0.1 fF/μm 0.02 – 0.1 fF/μm (5–20 μm gap) 0.05 – 0.5 fF/μm > 1 fF/μm Fringe fields at edges add to intended coupling capacitance; must be in C_g design model ~30–50% of C_g in typical transmon designs comes from fringe; underestimating shifts f by 50+ MHz 33 Wirebond Pad Parasitic Cap C_pad_wb / fF Q3D parallel-plate + fringe approximation; or analytical C = ε₀ εr A/d 20 – 150 fF > 300 fF Bond-pad capacitance loads the signal line; degrades bandwidth and causes reflection at bond Reducing pad size from 150×150 μm to 80×80 μm cuts C_pad by ~2.5× with no bond yield penalty Electromagnetic Coupling Coupling outputs connect Q3D extraction to qubit-qubit, qubit-resonator, and package-mode interactions. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 34 External Quality Factor (Q_ext) Q_ext HFSS eigenmode + Q3D coupling capacitance extraction 10³ – 10⁵ 5×10³ – 2×10⁴ (dispersive readout) 10³ – 10⁵ 10⁶ Sets readout bandwidth κ = ω_r/Q_ext and Purcell loss rate; undercoupled → slow; overcoupled → Purcell Purcell limit: T₁_Purcell = Q_ext/ω_r × (Δ/g)²; Purcell filter relaxes this trade-off 35 Internal Quality Factor (Q_int) Q_int VNA transmission measurement; HFSS loss tangent input > 10⁶ (planar Al at 4K) > 10⁶ 10⁵ – 10⁶ Intrinsic resonator loss from TLS, dielectric, radiation; directly sets T₁ floor via Purcell Q_int > 10⁶ requires: HR-Si or sapphire substrate, clean metal deposition, minimal surface TLS 36 Loaded Quality Factor (Q_L) Q_L 1/Q_L = 1/Q_int + 1/Q_ext; VNA S21 Lorentzian fit 10³ – 10⁴ 10³ – 10⁴ (balanced readout) 500 – 2×10⁴ 10⁵ Determines resonator 3 dB bandwidth; BW = f_r/Q_L sets speed vs SNR tradeoff for readout In practice Q_L ≈ Q_ext when Q_int >> Q_ext (under-coupled limit is common design choice) 37 CPW Characteristic Impedance (Z₀) Z₀ / Ω Q3D RLGC → Z₀ = √(L'/C'); verified by HFSS S11 calibration 50 Ω ± 1 Ω 50 Ω ± 1 Ω 45 – 55 Ω 80 Ω Impedance mismatch causes reflections degrading signal integrity; Z₀ controlled by trace/gap ratio On 500 μm Si: 10 μm trace / 6 μm gap → Z₀ ≈ 50 Ω; wider trace → lower Z₀ 38 Effective Permittivity (ε_eff) ε_eff Q3D electrostatic fill factor calculation; HFSS eigenmode 6.0 – 6.5 (CPW on Si) 6.0 – 6.5 5.5 – 7.0 9 Sets propagation velocity v_ph = c/√ε_eff and resonator physical length for target frequency ε_eff depends on substrate filling fraction; ε_eff ≈ (1 + εr)/2 for CPW in air on substrate 39 Coupling Coefficient k² k² / ×10⁻³ Q3D capacitance ratio k² = C_g² / (C_1 × C_2) 1 – 10 ×10⁻³ 1 – 10 ×10⁻³ 0.5 – 20 ×10⁻³ 50 ×10⁻³ Power transfer efficiency between resonator and feedline; determines Q_ext directly k² ∝ gap width at coupling capacitor; etch depth variation of 0.1 μm → δk²/k² ~ 5% Substrate & Dielectric Loss Substrate and dielectric-loss outputs explain how material selection and surface participation affect T1. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 40 Substrate Bulk Loss Tangent tan δ_bulk Q3D dielectric loss tangent input; resonator Q fitting vs power 10⁻⁶ – 10⁻⁵ > 10⁻⁴ Bulk dielectric loss sets floor on 1/Q_int from substrate volume; sapphire tan δ improves by 10–100× on cooling from 300K to 4K due to reduced phonon and TLS population 41 Metal-Air Interface Loss (tan δ_MA) tan δ_MA Surface participation ratio (SPR) from Q3D E-field + measured Q factor ~10⁻³ 10⁻³ – 5×10⁻³ > 10⁻² TLS loss at metal-air interface is the dominant T₁ source in planar transmon designs Etching native oxide before Al deposition reduces tan δ_MA by up to 10×; HF vapor clean 42 Substrate-Air Interface Loss (tan δ_SA) tan δ_SA SPR analysis from Q3D E-field distribution ~5×10⁻⁴ 5×10⁻⁴ – 5×10⁻³ > 10⁻² TLS at substrate exposed surface; addressed by passivation, UV ozone clean, or dry etching Hydrogen-passivated Si surface (HF dip) shows 5× lower tan δ_SA vs untreated Si 43 Metal-Substrate Interface Loss (tan δ_MS) tan δ_MS EELS/TEM interface composition + Q3D SPR calculation ~5×10⁻³ 5×10⁻³ – 10⁻² > 5×10⁻² TLS at Al–Si or Nb–Si interface; reduced by HF dip substrate prep before metal deposition Amorphous interfacial SiOx layer of 1–2 nm is the primary TLS host; substrate HF clean removes it 44 Surface Participation Ratio (SPR) p_MA / ppm Q3D E-field energy integral on metal-air interface: p = ∫_MA ε|E|²dV / ∫_all ε|E|²dV 5 – 50 ppm 5 – 50 ppm > 200 ppm p × tan δ contributes directly to 1/Q; minimise by thick metal, wider gap, no sharp corners. For planar transmons, p_MA can reach 100–1000 ppm without geometry optimisation. 1/Q_TLS = Σ p_i × tan δ_i; SPR is the design lever; tan δ is the material lever. Skin Effect & Frequency-Dependent Frequency-dependent checks show how conductor behavior changes with microwave frequency, penetration depth, and kinetic inductance. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 45 Skin Depth at 5 GHz δ_s / μm δ_s = √(2ρ/ωμ); Q3D skin-effect mode at frequency 0.9 μm (Al at RT) 0.5 – 2 μm 0.5 – 3 μm > 5 μm (film If metal thickness Al at 4K is superconducting so δ_s concept replaced by London penetration depth λ_L: bulk Al ~16–55 nm; thin-film Al (50–200 nm film) typically 60–163 nm — increases as film thickness decreases 46 AC/DC Resistance Ratio R_ac/R_dc Q3D frequency sweep; skin-effect solver comparison at DC vs 5 GHz 1.0 – 1.05 (thin film) ≈ 1.0 (thin film 1.0 – 2.0 > 5 Thin-film qubits (t ~ 100–200 nm) operate below skin-depth limit so R_ac ≈ R_dc Normal-metal (Cu, Au) transmission lines show R_ac/R_dc ~ 3–5 at 5 GHz; use SC lines at mK 47 Propagation Constant (γ) α / dB/m, β / rad/m Q3D RLGC → γ = √((R+jωL)(G+jωC)) α α α 0.1 – 1 dB/m α > 10 dB/m α sets transmission line attenuation; β sets phase velocity; both from RLGC per unit length For long interconnects (> 10 mm) even 0.1 dB/m causes measurable signal loss; use SC Al/Nb 48 Phase Velocity (v_ph) v_ph / ×10⁸ m/s Q3D RLGC → v_ph = ω/β = 1/√(L'C') 1.2 – 1.4 ×10⁸ m/s 1.2 – 1.4 ×10⁸ m/s (CPW on Si) 1.0 – 1.6 ×10⁸ m/s 2.0 Sets resonator physical length for target frequency; L = v_ph/(4f_r) for λ/4 resonator v_ph = c/√ε_eff; on Si ε_eff ≈ 6.3 → v_ph ≈ 1.19×10⁸ m/s; λ/4 at 7 GHz ≈ 4.25 mm 49 Per-Unit-Length Resistance (R') R' / mΩ/mm Q3D frequency-dependent R matrix; RLGC R' vs frequency 0.1 – 2 mΩ/mm > 10 mΩ/mm Distributed series resistance determines attenuation α ≈ R'/(2Z₀); critical for long interconnects At 4K Al becomes superconducting: R' → 0 below T_c; use R' to identify non-SC regions 50 Per-Unit-Length Inductance (L') L' / nH/mm Q3D RLGC magnetostatic solve 0.3 – 0.5 nH/mm 0.3 – 0.5 nH/mm (50 Ω CPW on Si) 0.2 – 0.8 nH/mm 2 nH/mm Distributed inductance per mm; with C' sets Z₀ = √(L'/C') and v_ph = 1/√(L'C') L' includes both geometric and kinetic contributions; L'_kinetic small for Al (~0.01–0.05 nH/mm) 51 Per-Unit-Length Capacitance (C') C' / pF/mm Q3D RLGC electrostatic solve 0.1 – 0.2 pF/mm 0.1 – 0.2 pF/mm (50 Ω CPW on Si) 0.05 – 0.3 pF/mm 0.5 pF/mm Distributed capacitance per mm; with L' sets Z₀ and ε_eff; narrow gap increases C' (lowers Z₀) Check: Z₀ = √(L'/C') ≈ 50 Ω; v_ph = 1/√(L'×C') ≈ 1.2×10⁸ m/s; these are consistency checks Post-Processing Derived Outputs Derived outputs convert Q3D matrices into qubit design metrics such as Ec, Ej, g, chi, ZZ, and Purcell rate. # Parameter Symbol / Unit Extraction Method Typical Q3D Value Ideal / Optimal Good Range Worst Case Why It Matters Key Design Note 52 Charging Energy (Ec/h) Ec / h·MHz Ec = e²/(2C_Σ); C_Σ from Q3D Maxwell matrix 200 – 350 MHz 200 – 350 MHz (transmon optimum) 150 – 400 MHz 1 GHz Sets charge sensitivity; Ej/Ec = 50–80 ideal for transmon; deviating worsens noise or anharmonicity Ec/h = 200 MHz → C_Σ = 91 fF; exact C_Σ from Q3D is the critical input to Hamiltonian model 53 Josephson Energy (Ej/h) Ej / h·GHz Ej = Φ₀²/(2L_J) = Φ₀ I_c / 2π 10 – 30 GHz 10 – 30 GHz (Ej/Ec ~ 50–80) 5 – 50 GHz 100 GHz With Ec determines qubit frequency f₀₁ ≈ √(8EjEc)/h − Ec/h and anharmonicity α = −Ec/h Ej is tunable via flux in split-junction transmons; Ej/Ec spread across chip sets yield 54 Qubit–Resonator Coupling (g/2π) g / 2π / MHz g = C_g/(C_Σ) × √(ω_q ω_r)/2; C_g from Q3D off-diagonal 50 – 150 MHz 50 – 150 MHz (dispersive regime) 20 – 300 MHz 500 MHz Vacuum Rabi coupling; in dispersive regime (g ≪ Δ) enables QND readout without qubit decay g/Δ 55 Dispersive Shift (χ/2π) χ / 2π / MHz χ = g²/Δ × α/(Δ+α); Δ = ω_q − ω_r; all from Q3D + junction params 1 – 5 MHz 1 – 5 MHz 0.5 – 10 MHz 20 MHz Qubit-state-dependent resonator shift; single-shot readout SNR ∝ χ/κ; larger χ → better fidelity χ and Purcell rate trade off via g; Purcell filter allows larger g without excess Purcell loss 56 ZZ Coupling Rate (ζ/2π) ζ / 2π / kHz ζ = 2g²χ²/(Δ·α·(Δ+α)); derived from Q3D coupling capacitances 10 – 100 kHz 10 – 50 kHz > 200 kHz Always-on conditional phase rate between qubits; leads to leakage in spectator qubits during gates ZZ suppression is the central challenge of transmon scaling; tunable coupler can push ζ 57 Anharmonicity (α/2π) α / 2π / MHz α = −Ec/h; Ec from Q3D C_Σ; or directly measured by two-tone spectroscopy −200 to −300 MHz −300 to −150 MHz −350 to −100 MHz |α|/2π Separates |0〉→|1〉 from |1〉→|2〉 transitions; sets minimum gate duration without leakage Gate bandwidth BW 5 ns 58 Purcell Decay Rate (Γ_P/2π) Γ_P / 2π / kHz Γ_P = (g/Δ)² × κ; κ = ω_r/Q_ext from Q3D; g from coupling cap 1 – 10 kHz 1 – 10 kHz > 100 kHz Resonator-induced qubit relaxation limiting T₁ even with long material T₁; mitigated by filter Purcell filter (bandpass on resonator port) can reduce Γ_P by 10–100× without affecting readout Key Takeaways Use these points as the practical Q3D learning summary for QClang users. RLGC Matrices R, L, G, C matrices from Q3D are the primary inputs to circuit Hamiltonian models. Even small parasitic entries shift qubit frequencies by 10–100 MHz. Superconducting Regime At 4K, Al and Nb become superconducting → R→0, L_k dominates. Normal-metal values from Q3D need T-dependent correction. Surface Participation SPR × tan δ controls T₁. Design rule: minimise p_MA below 5 ppm via thick metal, wider CPW gaps, and clean interfaces. Derived Outputs Ec, Ej, g, χ, ζ, Γ_P are all computed from Q3D matrices. Iterating Q3D → Hamiltonian → optimise is the standard qubit design loop."
  },
  {
    "id": "epr-results-analysis",
    "title": "EPR / scQubits Analysis",
    "text": "Results Analysis EPR / scQubits Analysis EPR and scQubits results connect electromagnetic field energy to quantum-circuit behavior. Each workbook table is kept as a subcolumn under the main EPR analysis page. Core EPR Participation ratios, zero-point fluctuations, and Hamiltonian extraction. Performance Qubit coherence, gate fidelity, resonator coupling, and loss channels. Simulation quality Convergence and accuracy checks that make EPR extraction reliable. Summary table A complete parameter reference for learners and future QClang result mapping. EPR / scQubits Result Tables Workbook sheets as learning subcolumns Overview Energy Participation Ratio (EPR) Analysis — Quantum Computing Output Parameters Comprehensive reference of all EPR output parameters, optimal values, good/worst thresholds — compiled from research literature & theses ?? Sheet Guide Sheet Name Description Overview This sheet — legend, color guide, and sheet index Core EPR Parameters Primary outputs: energy participation ratios, loss rates, coupling strengths Qubit Performance Qubit quality metrics derived from EPR: T1, T2, anharmonicity, charge dispersion Resonator & Coupling Resonator frequency, Purcell decay, cross-Kerr, dispersive shift ? Loss & Dissipation Dielectric loss, TLS loss, radiation loss, seam loss, surface participation Junction Parameters Josephson junction inductance, participation ratio, ZPF voltage Simulation Convergence Mesh convergence, eigenmode accuracy, simulation quality indicators Summary Table Single consolidated master table across all categories ?? Color Legend GOOD / OPTIMAL Parameter is within the best-practice range for high-coherence devices ACCEPTABLE Parameter is functional but leaves room for improvement POOR / WORST Parameter degrades device performance; redesign recommended HEADER / CATEGORY Section or column header DATA ROW Standard data entry row Core EPR Parameters Core EPR Parameters ? Primary outputs of the EPR method: participation ratios, zero-point fluctuations, and mode hybridization metrics A. Junction Energy Participation Ratios Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Junction Participation Ratio (transmon) p_J dimensionless Fraction of total inductive energy stored in the Josephson junction for the qubit mode. Central quantity of EPR method. 0.90 – 0.99 0.80 – 0.99 0.50 – 0.79 High p_J maximises anharmonicity and qubit nonlinearity; low values reduce gate speed and anharmonicity. Minev et al., Nature 2021; Solgun et al., PRApplied 2019 Junction Participation Ratio (readout mode) p_J^res dimensionless Fraction of readout resonator mode energy in the junction. Should be minimised to reduce Purcell loss. 1×10?²–5×10?² > 0.10 Large p_J^res couples resonator decay channel to qubit, reducing T1 via Purcell effect. Reed et al., PRL 2010; Houck et al., PRL 2008 Total Junction Participation (all modes) Sp_J dimensionless Sum of participation ratios across all simulated eigenmodes; normalization check. ˜ 1.00 (±0.01) 0.98 – 1.02 0.95 – 1.04 1.10 Deviation from unity indicates missing modes, poor mesh, or incomplete boundary conditions. Minev, PhD Thesis Yale 2018; Nigg et al., PRL 2012 Participation Ratio Asymmetry ?pJ dimensionless Difference in junction participation between two junctions in a split-junction (SQUID) qubit. 0.05–0.15 > 0.20 Asymmetry leads to flux-noise sensitivity and reduced coherence in tunable qubits. Koch et al., PRA 2007; Krantz et al., APR 2019 B. Zero-Point Fluctuation (ZPF) Quantities Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References ZPF Voltage across Junction V_zpf µV RMS zero-point voltage fluctuation across the Josephson junction; sets qubit–photon coupling strength. 10 – 50 µV 5 – 100 µV 1 – 200 µV 500 µV Too small ? weak anharmonicity; too large ? unwanted multiphoton transitions and leakage. Minev et al., Nature 2021; Blais et al., RMP 2021 ZPF Current through Junction I_zpf nA RMS zero-point current fluctuation; related to V_zpf via junction inductance. 1 – 10 nA 0.5 – 20 nA 0.1 – 50 nA Determines coupling to flux noise and magnetic environment; critical for flux qubits. Orlando et al., PRB 1999; Mooij et al., Science 1999 ZPF Phase across Junction f_zpf rad RMS zero-point phase fluctuation f_zpf = v(2eV_zpf/??_q). Governs perturbative expansion validity. 0.1 – 0.5 rad 0.05 – 0.6 rad 0.6 – 0.9 rad > 1.0 rad Values >1 rad invalidate the perturbative (dispersive) approximation used in EPR. Minev Thesis 2018; Koch et al., PRA 2007 Hybridization Factor ? dimensionless Degree of mode hybridization between qubit and resonator; off-diagonal element in EPR Hamiltonian. 0.05 – 0.15 > 0.20 Large hybridization mixes qubit and resonator, degrading single-mode approximation. Solgun et al., PRApplied 2019; Blais et al., PRA 2004 C. Hamiltonian Parameters Extracted via EPR Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Qubit Frequency (extracted) ?_q/2p GHz Fundamental qubit transition frequency extracted from EPR eigenmode simulation. 4 – 6 GHz 3 – 8 GHz 1 – 3 or 8–12 GHz 15 GHz Outside optimal window: low freq ? thermal excitation; high freq ? limited coupling hardware. Krantz et al., APR 2019; Arute et al., Nature 2019 Anharmonicity (EPR-derived) a/2p MHz Qubit anharmonicity = ?_12 - ?_01; extracted via second-order EPR perturbation theory. 150 – 350 MHz 100 – 400 MHz 50 – 99 MHz Insufficient anharmonicity causes leakage to |2? during gates; >400 MHz may indicate charge noise sensitivity. Koch et al., PRA 2007; Barends et al., PRL 2013 Kerr Self-Nonlinearity K/2p MHz Effective Kerr coefficient (= anharmonicity for transmon); second-order EPR correction term. 150 – 300 MHz 100 – 400 MHz 50 – 99 MHz Sets speed limit of single-qubit gates; related to DRAG pulse requirements. Gambetta et al., PRA 2011; Motzoi et al., PRL 2009 Dispersive Shift ?/2p ?/2p MHz Qubit-state-dependent resonator frequency shift; critical for high-fidelity dispersive readout. 0.5 – 3 MHz 0.1 – 5 MHz 0.01 – 0.09 MHz 10 MHz Too small ? insufficient readout contrast; too large ? measurement-induced dephasing. Blais et al., PRA 2004; Gambetta et al., PRA 2006 Cross-Kerr (qubit-qubit) ?_ij/2p MHz Always-on ZZ interaction between coupled qubits; parasitic term in multi-qubit chips. 0.10 – 0.50 MHz > 1.0 MHz Large ZZ causes always-on entanglement errors; major source of two-qubit gate infidelity. Kandala et al., Nature 2021; Ku et al., PRL 2020 Qubit Performance Qubit Performance Metrics ? Coherence times, gate fidelities, and spectral properties derived from EPR loss analysis A. Coherence Times Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Energy Relaxation Time T1 T1 µs Time for qubit to decay from |1? to |0?; bounded by all loss channels weighted by EPR participation. > 500 µs 100 – 500 µs 10 – 99 µs T1 is the hard ceiling on gate fidelity; EPR identifies dominant loss channel for improvement. Wang et al., PRApplied 2022; Place et al., NC 2021 Pure Dephasing Time T_f T_f µs Dephasing time due to low-frequency noise (flux, charge, 1/f); not directly from EPR but informed by participation. > 200 µs 50 – 200 µs 10 – 49 µs Limits T2; EPR participation at surfaces informs TLS dephasing contribution. Ithier et al., PRB 2005; Bylander et al., Nature Phys 2011 Coherence Time T2 (Ramsey) T2* µs Total dephasing time including low-frequency noise; T2* = 2T1. > 300 µs 100 – 300 µs 20 – 99 µs Practical coherence limit; T2*/2T1 ? 1 indicates pure-dephasing free regime. Krantz et al., APR 2019; Jurcevic et al., Quantum Sci. Tech. 2021 Coherence Time T2 (Echo) T2E µs Echo coherence time; removes low-frequency noise contributions; T2E = 2T1. > 500 µs 200 – 500 µs 50 – 199 µs Ratio T2E/T2* quantifies 1/f noise power; EPR participations guide substrate/surface optimization. Muhonen et al., Nature Nano 2014; Yurtalan et al., Commun. Phys. 2020 Quality Factor Q_qubit Q_q dimensionless Qubit quality factor Q = ?_q·T1; dimensionless figure of merit across frequencies. > 107 106 – 107 105 – 106 Universal metric independent of frequency; Q > 107 represents state-of-the-art performance. Kosen et al., npj QI 2022; Ganjam et al., Nature Commun. 2023 B. Gate Performance Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Single-Qubit Gate Fidelity F_1Q % Average fidelity of single-qubit Clifford gates; limited by T1, T2, leakage (anharmonicity). > 99.9% 99.5 – 99.9% 99.0 – 99.4% Barends et al., Nature 2014; Jurcevic et al., QST 2021 Two-Qubit Gate Fidelity F_2Q % Average fidelity of two-qubit entangling gates (CZ, iSWAP); limited by ZZ, T1, T2. > 99.5% 99.0 – 99.5% 97.0 – 98.9% ZZ coupling (cross-Kerr from EPR) is primary source of two-qubit gate error on fixed-frequency chips. Arute et al., Nature 2019; Sung et al., PRX 2021 Leakage Rate L1 % per gate Probability of leaking to non-computational |2? state per gate operation. 0.1 – 0.5% > 1.0% Leakage non-destructively accumulates; requires active reset. Minimized by maximising anharmonicity. Motzoi et al., PRL 2009; Wood & Gambetta, PRA 2018 Readout Fidelity F_RO % Assignment fidelity for single-shot qubit state discrimination. > 99% 97 – 99% 90 – 96% Limited by ? (must be large), T1 during readout, photon number. ? extracted directly via EPR. Walter et al., PRApplied 2017; Krantz et al., APR 2019 C. Spectral Properties Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Charge Dispersion e_q MHz Sensitivity of qubit frequency to offset charge; exponentially suppressed in transmon regime. 0.1 – 1 MHz > 5 MHz Large dispersion ? charge noise dephasing. EPR ratio EJ/EC must be > 50 for transmon. Koch et al., PRA 2007; Schreier et al., PRB 2008 EJ/EC Ratio EJ/EC dimensionless Josephson to charging energy ratio; governs charge noise sensitivity vs. anharmonicity trade-off. 50 – 100 40 – 120 20 – 39 150: anharmonicity too small for fast gates. Koch et al., PRA 2007; Krantz et al., APR 2019 Flux Sensitivity (tunable qubits) ??/?F GHz/F0 Sensitivity of qubit frequency to external flux; relevant for flux-tunable transmons and SQUID qubits. 0.5 – 2 GHz/F0 > 5 GHz/F0 High flux sensitivity amplifies flux noise dephasing; biasing at sweet spot minimizes first-order sensitivity. Hutchings et al., PRApplied 2017; Yan et al., Nature Commun. 2016 Frequency Spread (fabrication) s_?/2p MHz Standard deviation of qubit frequencies across a chip due to junction fabrication variation. 20 – 50 MHz > 100 MHz Large spread causes frequency collisions; EPR helps identify geometry sensitivities to dimension variation. Kreikebaum et al., npj QI 2020; Osman et al., npj QI 2023 Resonator & Coupling Resonator & Coupling Parameters ? Readout and bus resonator characteristics plus qubit-resonator coupling extracted via EPR A. Resonator Properties Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Resonator Frequency ?_r/2p GHz Bare resonator frequency; should be detuned from qubit to remain in dispersive regime. 6.5 – 8.5 GHz 5 – 10 GHz 3 – 5 GHz Must satisfy |?| = |?_q - ?_r| >> g for dispersive approximation; EPR gives bare frequency. Blais et al., PRA 2004; Wallraff et al., Nature 2004 Resonator Internal Q Q_int dimensionless Internal (material-limited) quality factor of the readout resonator. > 105 104 – 105 10³ – 104 Low Q_int adds photon loss increasing measurement back-action and reducing readout SNR. Megrant et al., APL 2012; Calusine et al., APL 2018 Resonator External Q Q_ext dimensionless External quality factor set by coupling to transmission line; determines measurement bandwidth. 10³ – 104 (fast readout) 500 – 2×104 50 – 499 Too high ? slow readout; too low ? Purcell-enhanced qubit decay. Optimized with Purcell filter. Reed et al., APL 2010; Houck et al., PRL 2008 Resonator–Qubit Detuning |?| |?|/2p GHz Frequency detuning between qubit and resonator; must be large compared to coupling g. 1.0 – 3.0 GHz 0.5 – 4.0 GHz 0.1 – 0.5 GHz Small detuning violates dispersive approximation; EPR hybridization factor ? tracks this. Blais et al., PRA 2004; Gambetta et al., PRA 2006 Purcell Decay Rate ?_P/2p kHz Qubit decay rate via resonator Purcell channel; ? × (g/?)². Must be 1 – 10 kHz 10 – 100 kHz > 500 kHz Dominant T1 limit in many designs without Purcell filter; directly predicted by EPR p_J^res. Houck et al., PRL 2008; Reed et al., APL 2010 B. Coupling Strengths Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Transverse Coupling g/2p g/2p MHz Qubit-resonator coupling strength (Jaynes-Cummings); extracted from EPR as g = v(p_J^res · ?_r · ?_q/2). 50 – 150 MHz 20 – 200 MHz 5 – 19 MHz Sets ? and readout speed; g/|?| Wallraff et al., Nature 2004; Krantz et al., APR 2019 Dispersive Coupling g/? ratio g/|?| dimensionless Dimensionless ratio quantifying proximity to strong-coupling limit; must be 0.01 – 0.05 0.005 – 0.09 0.09 – 0.15 > 0.20 Ratio > 0.1 causes photon-number-dependent qubit dephasing and higher-order dispersive corrections. Gambetta et al., PRA 2006; Boissonneault et al., PRA 2009 Bus Coupler Coupling (2Q) J/2p MHz Exchange coupling between two qubits via bus resonator or direct capacitance. 5 – 20 MHz 2 – 30 MHz 0.5 – 1.9 MHz Too weak ? slow two-qubit gates; too strong ? residual ZZ. EPR predicts J from geometry. Majer et al., Nature 2007; Chen et al., PRL 2014 Residual ZZ (static) ?_ZZ/2p kHz Always-on longitudinal (ZZ) qubit–qubit interaction; source of conditional phase errors. 100 – 500 kHz > 1 MHz Limits two-qubit gate fidelity via conditional phase accumulation; minimized by tunable couplers. Ku et al., PRL 2020; Kandala et al., Nature 2021 Stray Coupling (nearest-neighbor) J_stray/2p kHz Unintended coupling between non-adjacent qubits; extracted from full-chip EPR simulation. 50 – 200 kHz > 500 kHz Degrades multi-qubit gate fidelity; EPR full-chip simulation essential to identify stray modes. Arute et al., Nature 2019; Hertzberg et al., npj QI 2021 Loss & Dissipation Loss & Dissipation Parameters ? Dielectric, surface, radiation, and junction loss channels identified and weighted by EPR participations A. Dielectric Loss (Bulk & Surface) Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Bulk Substrate Loss Tangent tan d_bulk dimensionless Intrinsic dielectric loss of the substrate material (Si, sapphire, SiO2); weighted by bulk EPR participation. 1×10?6 – 1×10?5 > 1×10?4 Silicon and sapphire are preferred substrates; amorphous SiO2 has tan d ~ 10?³ (very poor). Martinis et al., PRL 2005; Calusine et al., APL 2018 Metal-Substrate Interface Loss tan d_MS dimensionless Effective loss tangent of metal–substrate (MS) two-level system (TLS) interface layer. 3×10?³ – 1×10?² > 5×10?² MS interface is typically 2–5 nm thick oxide layer; dominant loss in many planar qubits. Wang et al., APL 2015; Niepce et al., PRApplied 2019 Substrate-Air Interface Loss tan d_SA dimensionless Effective loss tangent of substrate–air (SA) interface; due to adsorbed surface oxides and organics. 1×10?² – 5×10?² > 0.1 Cleaning and surface passivation reduce SA loss; participation ratio from EPR isolates this channel. Wenner et al., APL 2011; Quintana et al., APL 2014 Metal-Air Interface Loss tan d_MA dimensionless Effective loss tangent of metal–air (MA) interface; native oxide on superconducting film top surface. 1×10?² – 5×10?² > 0.1 Nb and Al form native oxides; replacing top surface with clean metal reduces MA loss. Sandberg et al., APL 2012; Nersisyan et al., Quantum 2019 Surface Participation Ratio (MS) p_MS dimensionless Fraction of electric field energy in metal-substrate interface region; computed from EPR E-field. 2×10?³ – 1×10?² > 5×10?² Thinner gaps increase p_MS; EPR identifies geometry changes to reduce interface participation. Wenner et al., APL 2011; Gambetta et al., npj QI 2017 TLS-Limited Quality Factor (1/f) Q_TLS dimensionless Quality factor limited by two-level system (TLS) bath; power- and temperature-dependent. > 3×106 106 – 3×106 105 – 106 Q_TLS improves with high drive power (TLS saturation); EPR participations give TLS contribution breakdown. Martinis et al., PRL 2005; Müller et al., PRB 2019 B. Radiation & Geometry Loss Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Radiation Loss Rate ?_rad/2p kHz Energy loss due to electromagnetic radiation from non-closed geometry; computed by EPR from far-field. 10 – 100 kHz > 500 kHz Open transmission line stubs or poorly designed ground planes lead to radiation loss. Houck et al., PRL 2008; Solgun et al., PRApplied 2019 Seam Loss (3D cavities) ?_seam/2p kHz Loss at mechanical seam between cavity halves; critical for 3D transmon and fluxonium devices. 5 – 50 kHz > 200 kHz EPR current participation at seam predicts seam loss; improved by indium bonding or tight tolerances. Reagor et al., PRB 2016; Brecht et al., npj QI 2016 Quasiparticle Loss Rate ?_qp/2p kHz Qubit decay due to nonequilibrium quasiparticles tunneling across junction. 20 – 100 kHz > 500 kHz Quasiparticle poisoning is stochastic; mitigated by gap engineering and quasiparticle traps. Catelani et al., PRL 2011; Serniak et al., PRL 2018 Vortex Loss (in-field operation) ?_vortex/2p kHz Loss from magnetic vortices in superconducting film when operated in residual magnetic field. 10 – 100 kHz > 500 kHz Mitigated by magnetic shielding and moat structures; EPR current maps identify vortex-sensitive areas. Stan et al., IEEE Trans. 2004; Chiaro et al., Supercond. Sci. Tech. 2016 Conductor (Ohmic) Loss ?_ohm/2p kHz Residual ohmic loss from non-superconducting regions or above Tc contributions; usually negligible in Al. 1 – 10 kHz > 100 kHz Typically negligible at mK temperatures; relevant for normal-metal contacts or resistive wirebonds. Göppl et al., JAP 2008; Barends et al., APL 2010 Junction Parameters Josephson Junction Parameters ? Junction electrical and physical parameters extracted from or used as inputs to EPR analysis A. Junction Electrical Parameters Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Josephson Inductance L_J nH Linear (small-signal) inductance of Josephson junction; L_J = F0/(2pI_c). Central EPR input. 5 – 20 nH 2 – 50 nH 50 – 200 nH > 500 nH Sets qubit frequency via ?_q = 1/v(L_J·C_S); too large ? very low frequency, thermally excited. Koch et al., PRA 2007; Krantz et al., APR 2019 Critical Current I_c µA Maximum supercurrent through junction; I_c = F0/(2pL_J). Sets EJ = I_c·F0/(2p). 20 – 80 nA (transmon) 5 – 200 nA 200 nA – 2 µA > 10 µA Too high ? small L_J ? high frequency; too low ? large L_J, strong flux noise sensitivity. Dolan 1977 (shadow evaporation); Ambegaokar & Baratoff, PRL 1963 Critical Current Density J_c A/m² Critical current per junction area; set by AlOx barrier thickness during deposition. 100 – 500 A/m² 50 – 1000 A/m² 1000 – 5000 A/m² > 104 A/m² Reproducibility of J_c determines frequency spread; EPR sensitivity analysis relates Jc to ?_q. Pop et al., Nature 2014; Osman et al., npj QI 2023 Junction Capacitance C_J fF Self-capacitance of the junction; contributes to total qubit capacitance C_S. 2 – 10 fF 1 – 20 fF 20 – 100 fF > 200 fF Large C_J reduces charging energy EC, lowering anharmonicity; EPR partitions C_J from shunt. Koch et al., PRA 2007; Yan et al., PRApplied 2016 Junction Area A_J µm² Physical overlap area of the junction; A_J = I_c/J_c. Fabrication controlled. 0.01 – 0.1 µm² 0.005 – 0.5 µm² 0.5 – 2 µm² > 5 µm² Larger area ? larger C_J and lower EC; smaller area ? harder fabrication, larger variation. Kreikebaum et al., npj QI 2020; Hertzberg et al., npj QI 2021 Josephson Energy EJ/h GHz Josephson energy EJ = I_c·F0/(2p); governs tunneling energy. 10 – 50 GHz 5 – 100 GHz 100 – 500 GHz > 1 THz With EC, determines qubit spectrum; EJ/EC > 50 for transmon regime. Koch et al., PRA 2007; Nakamura et al., Nature 1999 Charging Energy EC/h MHz Charging energy EC = e²/(2C_S); determines anharmonicity and charge sensitivity. 150 – 350 MHz 100 – 500 MHz 500 MHz – 1 GHz > 2 GHz EC ~ anharmonicity for transmon; high EC ? charge qubit regime, high noise sensitivity. Koch et al., PRA 2007; Schreier et al., PRB 2008 B. Junction Loss & Quality Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Junction Loss Tangent tan d_J dimensionless Intrinsic dielectric loss of AlOx tunnel barrier; limits junction Q and T1. 1×10?5 – 1×10?4 > 1×10?³ TLS in AlOx barrier is historically the primary T1 limit; improved by ALD or crystalline barriers. Martinis et al., PRL 2005; Müller et al., PRB 2019 Junction Subgap Resistance R_sg GO Subgap resistance of junction; represents quasiparticle leakage channel. > 100 GO 10 – 100 GO 1 – 10 GO Low R_sg indicates excess quasiparticle density; limits T1 via quasiparticle poisoning. Aumentado et al., PRL 2004; Aumentado et al., J. Low Temp. Phys. 2011 Flux Noise Spectral Density S_F(1Hz) µF0²/Hz Amplitude of 1/f flux noise at 1 Hz; governs dephasing for flux-sensitive qubits. 1 – 5 µF0²/Hz 5 – 20 µF0²/Hz > 50 µF0²/Hz Arises from surface spin fluctuators; EPR current participation at surfaces informs sensitivity. Yoshihara et al., PRL 2006; Bialczak et al., PRL 2007 Charge Noise Spectral Density S_q(1Hz) e²/Hz Amplitude of 1/f charge noise; relevant for charge-sensitive qubits. 10?6 – 10?5 e²/Hz > 10?4 e²/Hz Exponentially suppressed in transmon regime; relevant for qubits with EJ/EC Ithier et al., PRB 2005; Paladino et al., RMP 2014 Simulation Convergence Simulation Convergence & Accuracy Metrics ? HFSS / pyEPR / Ansys eigenmode simulation quality indicators for reliable EPR extraction A. Eigenmode Solver Convergence Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Eigenfrequency Convergence ?Freq ?f/f ppm Relative change in eigenfrequency between successive mesh refinement passes. 50 – 500 ppm > 1000 ppm EPR frequencies directly set qubit and resonator values; poor convergence propagates to all outputs. Minev Thesis Yale 2018; Ansys HFSS Documentation 2023 Energy Error (Maxwell equations) ?U/U % Relative error in total electromagnetic energy from adaptive mesh refinement. 0.5 – 2% > 5% Energy error directly bounds participation ratio error; must be minimised for accurate loss prediction. Minev Thesis Yale 2018; Jin, FEM for Electromagnetics, 1993 Tetrahedral Mesh Count N_mesh thousands Number of tetrahedra in adaptive mesh; convergence criterion, not absolute target. 200 – 2000k 50 – 200k 10 – 50k Too few ? inaccurate fields, especially at thin features (junctions, gaps); too many ? slow. Minev Thesis Yale 2018; Solgun et al., PRApplied 2019 Number of Eigenmode Passes N_passes integer Adaptive refinement passes until convergence criterion is met. 10 – 20 passes 7 – 10 passes 4 – 6 passes Insufficient passes leave mesh unrefined in critical regions (junction vicinity, surface gaps). pyEPR documentation; Minev GitHub 2018 Mode Participation Sum Check Sp dimensionless Sum of EPR participations across all modes; should equal 1 for each junction. 0.99 – 1.01 0.97 – 1.03 0.93 – 1.07 1.10 Deviation indicates missing eigenmodes, disconnected networks, or mesh error in junction volume. Minev et al., Nature 2021; Nigg et al., PRL 2012 Participation Ratio Repeatability s_p/p % Run-to-run relative standard deviation of participation ratios across identical simulations. 2 – 5% > 10% Poor repeatability indicates stochastic mesh seeding issues; use fixed seed and fine mesh. Minev Thesis Yale 2018 B. Loss Analysis Simulation Quality Parameter Symbol Unit Description Optimal / Best Value Good Range Acceptable Range Poor / Worst Value Physical Significance Key References Surface Participation Error ?p_surf % Relative error in surface (interface) participation ratio from finite mesh at thin layers. 5 – 15% > 20% Thin oxide layers (2–5 nm) require extremely fine mesh; often estimated analytically. Wenner et al., APL 2011; Gambetta et al., npj QI 2017 Junction Volume Definition Accuracy ?V_J/V_J % Relative accuracy of the junction geometric volume used to compute junction participation. 5 – 10% > 20% Junction volume error directly maps to participation ratio error; critical CAD accuracy needed. Minev Thesis Yale 2018; Solgun et al., PRApplied 2019 Number of Loss Regions Modelled N_regions integer Number of distinct lossy material regions (interfaces) explicitly included in the EPR model. = 4 (MS, SA, MA, bulk) 3 2 1 (bulk only) Modelling only bulk misses dominant surface/interface losses in planar devices. Wenner et al., APL 2011; Wang et al., APL 2015 Frequency Band of Validity BW_valid GHz Frequency range over which the extracted Hamiltonian parameters are valid (no spurious modes). 0 – 15 GHz (no spurious) 0 – 10 GHz 5 – 10 GHz only Spurious modes present Spurious modes can hybridize with qubit and resonator, invalidating EPR sums. Minev Thesis 2018; Reagor et al., PRB 2016 Summary Table EPR Analysis — Master Summary Table ? All EPR output parameters consolidated — one row per parameter, sorted by category ? Core EPR # Category Parameter Symbol Unit Optimal Value Good Range Acceptable Range Worst Value Physical Significance Improvement Strategy Reference 1 Core EPR Junction Participation Ratio p_J — 0.90–0.99 0.80–0.99 0.50–0.79 Sets anharmonicity & qubit nonlinearity Increase pad size, reduce gap to substrate Minev et al., Nature 2021 2 Core EPR Resonator Junction Participation p_J^res — 1×10?²–5×10?² > 0.10 Determines Purcell T1 limit Increase qubit-resonator detuning Reed et al., PRL 2010 3 Core EPR ZPF Voltage across Junction V_zpf µV 10–50 µV 5–100 µV 1–200 µV Governs qubit-photon coupling Optimise mode volume and pad geometry Minev et al., Nature 2021 4 Core EPR ZPF Phase f_zpf rad 0.1–0.5 rad 0.05–0.6 rad 0.6–0.9 rad > 1.0 rad Validity of dispersive approximation Reduce anharmonicity target or redesign Minev Thesis 2018 5 Core EPR Anharmonicity (EPR) a/2p MHz 150–350 MHz 100–400 MHz 50–99 MHz Gate speed and leakage limit Lower EJ/EC ratio; smaller junction Koch et al., PRA 2007 6 Core EPR Dispersive Shift ? ?/2p MHz 0.5–3 MHz 0.1–5 MHz 0.01–0.09 MHz Readout contrast Adjust g/|?| ratio via geometry Blais et al., PRA 2004 7 Core EPR Cross-Kerr ZZ ?_ij/2p MHz 0.10–0.50 MHz > 1.0 MHz Always-on 2Q gate error Tunable coupler; echo sequences Kandala et al., Nature 2021 ? Qubit Performance # Category Parameter Symbol Unit Optimal Value Good Range Acceptable Range Worst Value Physical Significance Improvement Strategy Reference 8 Qubit Performance Energy Relaxation T1 T1 µs > 500 µs 100–500 µs 10–99 µs Hard limit on gate fidelity Reduce dominant loss channel from EPR Wang et al., PRApplied 2022 9 Qubit Performance Coherence Time T2* T2* µs > 300 µs 100–300 µs 20–99 µs Practical dephasing limit Reduce flux/charge noise; surface cleaning Krantz et al., APR 2019 10 Qubit Performance Qubit Quality Factor Q_q — > 107 106–107 105–106 Universal figure of merit Reduce all participation-weighted losses Ganjam et al., NC 2023 11 Qubit Performance Single-Qubit Gate Fidelity F_1Q % > 99.9% 99.5–99.9% 99.0–99.4% Surface-code threshold Increase T1/T2; optimise DRAG pulses Barends et al., Nature 2014 12 Qubit Performance Two-Qubit Gate Fidelity F_2Q % > 99.5% 99.0–99.5% 97.0–98.9% 2Q error correction threshold Reduce ZZ via tunable coupler design Arute et al., Nature 2019 13 Qubit Performance EJ/EC Ratio EJ/EC — 50–100 40–120 20–39 Charge noise protection Increase shunt capacitance C_S Koch et al., PRA 2007 ? Resonator & Coupling # Category Parameter Symbol Unit Optimal Value Good Range Acceptable Range Worst Value Physical Significance Improvement Strategy Reference 14 Resonator & Coupling Resonator Frequency ?_r/2p GHz 6.5–8.5 GHz 5–10 GHz 3–5 GHz Dispersive regime requirement Adjust resonator length/capacitance Blais et al., PRA 2004 15 Resonator & Coupling Resonator Internal Q Q_int — > 105 104–105 10³–104 Readout SNR and back-action Improve substrate and metal quality Megrant et al., APL 2012 16 Resonator & Coupling Coupling Strength g/2p g/2p MHz 50–150 MHz 20–200 MHz 5–19 MHz Sets ? and readout bandwidth Adjust coupling capacitor geometry Wallraff et al., Nature 2004 17 Resonator & Coupling Purcell Decay Rate ?_P/2p kHz 1–10 kHz 10–100 kHz > 500 kHz T1 limit via resonator Add Purcell filter; increase detuning Houck et al., PRL 2008 18 Resonator & Coupling Residual ZZ Static ?_ZZ/2p kHz 100–500 kHz > 1 MHz Conditional phase error Tunable coupler; frequency detuning Ku et al., PRL 2020 ? Loss & Dissipation # Category Parameter Symbol Unit Optimal Value Good Range Acceptable Range Worst Value Physical Significance Improvement Strategy Reference 19 Loss & Dissipation Bulk Substrate Loss Tangent tan d_bulk — 1×10?6–1×10?5 > 1×10?4 Bulk energy dissipation Use float-zone Si or sapphire Martinis et al., PRL 2005 20 Loss & Dissipation Metal-Substrate Interface Loss tan d_MS — 3×10?³–1×10?² > 5×10?² Dominant TLS loss channel Ion mill before deposition; clean surfaces Wang et al., APL 2015 21 Loss & Dissipation Surface Participation (MS) p_MS — 2×10?³–1×10?² > 5×10?² Weights MS interface loss to T1 Wider gaps; ground plane design Wenner et al., APL 2011 22 Loss & Dissipation TLS-Limited Q Q_TLS — > 3×106 106–3×106 105–106 TLS bath limitation Surface treatment; new barrier materials Müller et al., PRB 2019 23 Loss & Dissipation Seam Loss Rate (3D) ?_seam/2p kHz 5–50 kHz > 200 kHz 3D cavity assembly limit Indium sealing; tighter tolerances Reagor et al., PRB 2016 ? Junction Parameters # Category Parameter Symbol Unit Optimal Value Good Range Acceptable Range Worst Value Physical Significance Improvement Strategy Reference 24 Junction Parameters Josephson Inductance L_J nH 5–20 nH 2–50 nH 50–200 nH > 500 nH Sets qubit frequency Junction area and J_c control Koch et al., PRA 2007 25 Junction Parameters Josephson Energy EJ/h GHz 10–50 GHz 5–100 GHz 100–500 GHz > 1 THz Qubit spectrum with EC Barrier thickness and area Nakamura et al., Nature 1999 26 Junction Parameters Charging Energy EC/h MHz 150–350 MHz 100–500 MHz 500–1000 MHz > 2 GHz Anharmonicity and charge sensitivity Shunt capacitor area tuning Koch et al., PRA 2007 27 Junction Parameters Junction Loss Tangent tan d_J — 1×10?5–1×10?4 > 1×10?³ Intrinsic junction T1 limit ALD AlOx; crystalline barriers Martinis et al., PRL 2005 ? Simulation # Category Parameter Symbol Unit Optimal Value Good Range Acceptable Range Worst Value Physical Significance Improvement Strategy Reference 28 Simulation Eigenfrequency Convergence ?f/f ppm 50–500 ppm > 1000 ppm Accuracy of all extracted parameters More refinement passes; finer mesh Minev Thesis Yale 2018 29 Simulation Energy Error ?U/U % 0.5–2% > 5% Bounds participation ratio error Increase mesh density at interfaces Ansys HFSS Docs 2023 30 Simulation Participation Sum Check Sp — 0.99–1.01 0.97–1.03 0.93–1.07 1.10 Simulation completeness check Include all eigenmodes up to 20 GHz Minev et al., Nature 2021 Total Parameters: 30 # Category Parameter Symbol Unit Optimal Value Good Range Acceptable Range Worst Value Physical Significance Improvement Strategy Reference"
  },
  {
    "id": "api-reference",
    "title": "API Reference",
    "text": "API Reference API Reference The API reference should document the endpoints that connect QClang to the backend. Keep endpoint descriptions simple until final request and response schemas are ready. Method Path Purpose GET /api/qclang/status Check available dialects and compiler support. GET /api/qclang/examples Load built-in QClang examples. POST /api/qclang/parse Parse source into an AST-style result. POST /api/qclang/compile Compile source into the selected target output."
  },
  {
    "id": "integration",
    "title": "Integration",
    "text": "Integration Integration Integration documentation should explain how QClang connects the editor, backend compiler, design graph, routing, DRC, and exports. For now, this page gives only the intended integration parameters. Frontend editor Writes and submits QClang source text. Backend router Receives parse and compile API requests. Compiler service Parses, validates, and compiles source. Design pipeline Uses compiler output for graph, routing, checks, and exports."
  },
  {
    "id": "support",
    "title": "Support",
    "text": "Support Support Access official channels, developer resources, and reference documentation to assist with your QClang development, compilation, and integration workflows. Start with Hello World. Read the language blocks reference. Learn parse and compile endpoints. Submit issues or contribute via the official repository."
  }
];
