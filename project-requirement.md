
Confidential MEV-Protected TWAMM Hook — MVP Product Requirements Document (PRD)

1. Project Overview
This MVP focuses on building a fully functional Confidential MEV-Protected TWAMM Hook using:
- Uniswap v4 Hooks
- Fhenix FHE (Fully Homomorphic Encryption)

EigenLayer integration is removed for MVP (planned for v2). The goal is a working encrypted TWAMM demo that judges can test on-chain.

2. Problem Statement
Large periodic trades leak sensitive information and suffer from MEV exposure. TWAMM helps execute trades over time, but all parameters are public. This MVP solves confidentiality by encrypting all TWAMM parameters using FHE.

3. Goals & Success Criteria
Primary Goals
- Build a Uniswap v4 hook that supports encrypted TWAMM orders.
- Ensure encrypted parameters remain private end-to-end.
- Provide deterministic, testable execution.

Success Metrics
- Working encrypted TWAMM execution on testnet.
- No sensitive data leaked.
- Successful end-to-end demo: encrypt → submit → execute → withdraw.

4. Core Features (MVP Scope)
Encrypted Order Submission
Users submit:
- encrypted trade direction  
- encrypted total amount  
- encrypted duration  
The hook stores ciphertext only.

Encrypted TWAMM Scheduling
- Fixed interval execution (e.g., every X blocks).
- Slice computation handled using homomorphic arithmetic.

Confidential Execution
- Each slice computed from encrypted data.
- Only final token outputs are visible.

Cancellation
- Encrypted cancel signal.

View Functions
- Encrypted state  
- Public outputs  

5. Non-Goals (V2+)
- EigenLayer AVS off-chain compute layer
- Multi-chain support
- Complex batching logic
- ZK proofs

6. Technical Architecture
Components
- TWAMM Hook (Uniswap v4)
- Fhenix FHE Encryption Layer
- Frontend (local encryption + decryption)

Flow
1. Encrypt params in frontend.
2. Submit encrypted order.
3. Hook stores encrypted metadata.
4. Each interval executes encrypted slice.
5. User retrieves final output.

7. Requirements
Functional
- Accept encrypted TWAMM orders.
- Maintain encrypted state.
- Execute slices deterministically.
- Integrate with Uniswap v4 pool manager.

Non-Functional
- Confidentiality of user parameters.
- Gas-efficient enough for live demo.
- Reliability and deterministic behavior.

8. Smart Contract Interfaces
submitEncryptedOrder()
executeTWAMMSlice()
cancelEncryptedOrder()
getOrderStatus()

9. Risks & Mitigation
- High computation cost → keep arithmetic minimal.
- Hook integration bugs → use official templates.
- Demo failure → focus on one working pair + simple UI.

10. Hackathon Deliverables
- Smart contract (Uniswap v4 hook)
- Frontend demo
- Documentation + diagrams
- Recorded or live demo

11. Timeline (14-Day Hackathon Plan)
Day 1–2: Architecture + hook setup  
Day 3–4: FHE param storage  
Day 5–7: TWAMM encrypted logic  
Day 8–10: Frontend encryption flow  
Day 11–13: Testnet deployment + E2E testing  
Day 14: Final polish + demo  

