"""
Claude AI assistant router.
Provides context-aware help across all tools in the platform.
Falls back to rule-based responses when no API key is configured.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import get_optional_user
from app.config import settings
from app.models import User

router = APIRouter(prefix="/api/claude", tags=["claude"])


class ClaudeRequest(BaseModel):
    message: str
    context_type: str = "general"  # designer | canvas | layout | verification | physics
    context_data: dict | None = None
    history: list[dict] | None = None


SYSTEM_PROMPTS = {
    "general": (
        "You are the Silicofeller Quantum Studio AI assistant. "
        "You help quantum hardware engineers design, simulate, and verify superconducting quantum chips. "
        "Be concise, technical, and helpful."
    ),
    "designer": (
        "You are the AI design assistant for Silicofeller Quantum Studio. "
        "Help users design superconducting quantum chips by understanding their requirements "
        "and generating QCLang (.qc) design files. "
        "When asked to generate a design, produce a complete QCLang source block. "
        "Be precise about qubit counts, topologies, and frequencies."
    ),
    "canvas": (
        "You are the canvas editor assistant. "
        "Help users edit the visual quantum chip layout. "
        "Answer questions about component placement, connections, and properties. "
        "When asked to move or add components, describe exactly what changes to make."
    ),
    "verification": (
        "You are the verification assistant. "
        "Help users understand DRC violations, frequency collisions, and crosstalk warnings. "
        "Explain what each check means physically and how to fix violations."
    ),
    "physics": (
        "You are the physics analysis assistant. "
        "Help users understand qubit frequencies, coherence times, coupling strengths, "
        "and anharmonicity. Reference scqubits and AWS Palace simulation concepts."
    ),
}


async def _call_claude(
    message: str,
    context_type: str,
    context_data: dict | None,
    history: list[dict] | None,
) -> str:
    """Call Claude API if key is available, otherwise use rule-based fallback."""
    if settings.anthropic_api_key and settings.anthropic_api_key.startswith("sk-ant-"):
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

            msgs = []
            for h in (history or []):
                if h.get("role") in ("user", "assistant"):
                    msgs.append({"role": h["role"], "content": h["content"]})

            # Add context data as a system injection
            user_content = message
            if context_data:
                ctx_str = json.dumps(context_data, indent=2)
                user_content = f"Context:\n```json\n{ctx_str}\n```\n\nQuestion: {message}"

            msgs.append({"role": "user", "content": user_content})

            system = SYSTEM_PROMPTS.get(context_type, SYSTEM_PROMPTS["general"])
            response = await client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                system=system,
                messages=msgs,
            )
            return response.content[0].text
        except Exception as e:
            # Fall through to rule-based
            pass

    # Rule-based fallback
    return _rule_based_response(message, context_type, context_data)


def _rule_based_response(message: str, context_type: str, context_data: dict | None) -> str:
    """Rule-based AI responses for offline/no-key operation."""
    msg_lower = message.lower()

    # Topology questions
    if "heavy hex" in msg_lower or "heavy-hex" in msg_lower:
        return (
            "The **heavy-hex topology** (IBM's lattice pattern) connects each qubit to at most 3 neighbors. "
            "Odd-numbered qubits sit on edges, even-numbered on vertices. This reduces crosstalk while "
            "still supporting surface-code error correction. For 27 qubits use a 3-row hex lattice with "
            "13 data + 14 flag qubits."
        )

    if "transmon" in msg_lower and ("frequency" in msg_lower or "ghz" in msg_lower):
        return (
            "Transmon qubit frequencies are set by **EJ** (Josephson energy) and **EC** (charging energy): "
            "f₀₁ ≈ √(8·EJ·EC) − EC. "
            "Target 4.8–5.3 GHz for data qubits, 6.3–7.5 GHz for readout resonators. "
            "Keep adjacent qubits >100 MHz apart to avoid frequency collisions."
        )

    if "drc" in msg_lower or "design rule" in msg_lower:
        return (
            "**DRC violations** to watch for:\n"
            "- MIN_SPACING: qubits closer than 400 µm will have parasitic coupling\n"
            "- FREQUENCY_COLLISION: adjacent qubits < 50 MHz apart cause ZZ errors\n"
            "- OFF_CHIP: components outside the chip boundary need repositioning\n"
            "- DANGLING_NET: unconnected pins may cause fabrication yield issues"
        )

    if "coherence" in msg_lower or "t1" in msg_lower or "t2" in msg_lower:
        if context_data:
            sub = context_data.get("frequency_plan", {}).get("substrate", "silicon")
            return (
                f"For {sub} substrate, typical T1 is 80–300 µs and T2 is 120–400 µs. "
                "Sapphire gives the best coherence (~300 µs T1). "
                "Tantalum metallization has shown >300 µs T1 in recent experiments. "
                "Key limiting factors: substrate TLS defects, surface oxide, and microwave crosstalk."
            )
        return (
            "Coherence times depend heavily on substrate and metal choice:\n"
            "- Silicon + Al: T1 ~80 µs, T2 ~120 µs\n"
            "- Sapphire + Al: T1 ~250 µs, T2 ~350 µs\n"
            "- Sapphire + Ta: T1 ~300+ µs (state of the art)\n"
            "Key loss channels: two-level system (TLS) defects at substrate/metal interface."
        )

    if "generate" in msg_lower or "design" in msg_lower or "chip" in msg_lower:
        num = 5
        for n in [4, 5, 7, 9, 16, 27, 49, 64]:
            if str(n) in message:
                num = n
        return (
            f"I'll generate a {num}-qubit design for you. "
            "Use the chat input below to describe your requirements — "
            "qubit count, topology (heavy-hex, ring, chain, grid), "
            "target frequency, substrate, and metal. "
            "The compiler will produce the QCLang source and physical layout automatically."
        )

    if "qclang" in msg_lower or ".qc" in msg_lower:
        return (
            "**QCLang** (.qc) is the source of truth for your design. Basic syntax:\n"
            "```\nchip MyChip\n"
            "  variable target_frequency = 5.0\n"
            "  qubit Q0 type=transmon frequency=4.9\n"
            "  qubit Q1 type=transmon frequency=5.1\n"
            "  coupler C0 connect(Q0,Q1)\n"
            "  readout R0 connect(Q0)\n"
            "end\n```\n"
            "Changes to QCLang automatically recompile to the canvas and layout viewer."
        )

    if "material" in msg_lower or "substrate" in msg_lower or "sapphire" in msg_lower:
        return (
            "**Material selection** significantly impacts qubit performance:\n\n"
            "**Substrates:**\n"
            "- Silicon (Si): Standard, T1 ~80 µs, ε_r = 11.9\n"
            "- Sapphire (Al₂O₃): Best coherence, T1 ~250 µs, ε_r = 9.3\n"
            "- SiN: Good for kinetic inductance devices\n\n"
            "**Metals:**\n"
            "- Aluminum (Al): Standard CQED metal, Tc = 1.2 K\n"
            "- Niobium (Nb): Higher Tc = 9.2 K, better for resonators\n"
            "- Tantalum (Ta): State-of-the-art T1 > 300 µs\n"
            "- NbTiN: High kinetic inductance for KIDs and SNAIL arrays"
        )

    # Generic fallback
    return (
        "I'm your Quantum Studio assistant. I can help you:\n"
        "- **Design chips**: Describe your requirements and I'll generate QCLang\n"
        "- **Understand errors**: Paste a DRC violation or frequency collision\n"
        "- **Choose materials**: Compare substrate and metal options\n"
        "- **Physics analysis**: Interpret T1/T2, anharmonicity, and coupling\n"
        "- **Tapeout**: Guide you through fabrication spec generation\n\n"
        "What would you like to work on?"
    )


@router.post("/chat")
async def chat(
    body: ClaudeRequest,
    user: User | None = Depends(get_optional_user),
) -> dict[str, str]:
    response = await _call_claude(
        body.message,
        body.context_type,
        body.context_data,
        body.history,
    )
    return {"role": "assistant", "content": response}
