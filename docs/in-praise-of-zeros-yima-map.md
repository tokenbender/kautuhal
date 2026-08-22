# Yi Ma DRL book → In Praise of Zeros: full insight map

Provenance: 18-agent workflow (2026-06-10), one reader + one verifier per chapter (Ch2–Ch9, Appendix B).
All quotes below were grep-verified verbatim against the chapter HTML. Insights the verifiers flagged
as unsupported were dropped. Book: https://ma-lab-berkeley.github.io/deep-representation-learning-book/

Legend: S1 = Intelligence as a learned observer, S2 = The many forms of zeros, S3 = Meaningful zeros,
SERIES = seed for a later essay. (sharpen) = makes an existing essay claim precise; (extend) = enables a
new claim the essay doesn't make yet.

DIRECTION (2026-06-10): Part I is written from a GENERAL perspective — no PRISM, no
mask/scaffold/substrate coinage, no bridge to the circuits post. Where insights below say "PRISM",
read them as the general claim: a zero is meaningful iff the behavior survives the ablation, stated
with standard vocabulary (ablation, intervention, recovery). All supporting evidence (CFG, AoT,
CRATE segmentation, attention-thresholding theorem, identifiability) is third-party published work
and stands without any reference to our own program.

## Corrections to current draft claims

1. **Two levels of sparsity — the rotation argument, refined (settled in discussion 2026-06-10).**
   The essay's claim "intelligence gives rise to sparsity" is VALID at the observer level: low
   effective dimensionality — what can be left unsaid and restored — is rotation-invariant, so a
   rotated representation is the same observer. What Ch5 adds (Fig 5.12, `coding-transform.png`):
   *coordinate* zeros — skippable FLOPs, ablatable units, nameable features — are not
   rotation-invariant, and ΔR cannot prefer the sparse presentation; CRATE adds −λ‖Z‖₀ explicitly.
   Converting capacity-for-sparsity into written zeros requires a basis commitment, and the basis
   is chosen by the resource being saved (FLOPs, memory, experts, cache are all coordinate-level).
   The meter breaks the symmetry, not compression. Use as the S1→S2 hinge: compression decides how
   little must be active; it does not decide where the zeros are written — the observer is the same
   under rotation, the bill is not. Choosing where to write them is a design decision → many forms.
2. **The kid samples, he doesn't average.** Ch7: the optimal masked-autoencoder solution is the
   conditional mean E[X_m|X_v], which may not lie on the image manifold (hence blurry MAE
   reconstructions); true completion is conditional *sampling* from the posterior. The kid who shouts
   "Pikachu!" picks a point on the manifold — he never answers with a blur of plausible Pokemon.
3. **The reveal is optional.** Ch7 (SURE, ambient diffusion at 80% masking, 3D-from-2D
   self-consistency): an observer holding the measurement model can learn from partial observations
   alone — agreement among its own partial views replaces the answer key. The show's reveal is one
   external bit; self-consistency can do the rest. Soften "the reveal closes the loop" to "the reveal
   is the cheapest way to close the loop — and not the only one."

## S1 — Intelligence as a learned observer

- (sharpen, Ch2) Matrix completion gives the silhouette exact numbers: a rank-1 D×N matrix is exactly
  recoverable from D+N−1 of its D·N entries. Footnote 4 draws the line straight to masked
  autoencoding of images. Failure case included: independent entries → even one missing entry is
  unrecoverable from DN−1 observed.
- (sharpen, Ch2) The recovery contract: "The lower-dimensional and more structured the data
  distribution is, the easier it is to process, and the fewer observations are needed—provided that
  the algorithm effectively utilizes this low-dimensional structure."
- (sharpen, Ch7) "Determined, not guessed" is a degenerate posterior: "when the distribution of X is
  low-dimensional... if a sufficient part of X is observed, it fully determines X" — p(X|X_v)
  collapses to a delta function.
- (sharpen, Ch3/A2) "Pays only for surprise" has an equation: Tweedie — E[x|x_t] = x_t + t²∇log p_t.
  The only thing the denoiser adds is a gradient step against surprisal. The optimal denoiser for
  low-rank data is a rescaled projection: off-manifold directions "get immediately contracted to 0."
- (sharpen, Ch4/A2) Coding rate = log covering number of the *support* (Thm 4.1; A2 sandwich bound).
  Bits scale with intrinsic dimension d, not ambient D; the D−d ambient directions cost zero bits.
  Camera codes ℝ^D; observer codes ball indices on the sliver.
- (extend, Ch3) Resource theorem for the sliver: diffusion sampling steps scale as Õ(κ/L) with
  intrinsic dimension κ, not ambient D; sample complexity likewise. Compute and data are billed by
  the manifold, not the resolution. ("for generative diffusion models, scaling the model is not all
  you need!")
- (extend, A2) The completion map is injective (Jacobian I + (1−s/t)t²∇²log p_t is SPD): no two
  degraded observations share a completion. The address book has no duplicate entries — denoising
  destroys uncertainty without destroying identity.
- (extend, Ch9) The closed-loop learning signal is the residual e_t = x_t − x̂_t: surprise is
  literally the nonzero entries of the error vector. A good observer makes most of e_t zero — the
  camera/observer aphorism is itself a sparsity claim.
- (extend, Ch9) Abstraction is a sparsification gradient: higher-level autoencoders produce "more
  sparse and higher-level 'abstractions'" — going up the hierarchy is progressive zeroing-out. The
  word "Pikachu" is the sparsest code that still determines the rest.
- Bonus verbatim gift (Ch2): the book uses a TV-static example for the sliver — "In theory, the
  static could resolve to a natural image on any given frame, but even if you spend a thousand years
  looking at the TV screen, it will not." Same television as the essay's kid.

## S2 — The many forms of zeros

- (sharpen, Ch5) **The transformer is an unrolled sparsity machine.** CRATE: each layer = MSSA
  compression against K subspaces (this IS multi-head attention; softmax = subspace-membership
  estimation) followed by ISTA sparsification against a dictionary (this IS the MLP; ReLU is the
  literal soft-thresholding operator producing zeros). The taxonomy isn't a list of bolt-on tricks —
  the architecture is already made of sparsity operators.
- (sharpen, Ch5) Trained CRATE: token L1 sparsity decreases monotonically layer by layer EXCEPT the
  last layer — "dense features are important for prediction." Zeros serve processing; readout wants
  density.
- (extend, Ch2/Ch3/A2) Several taxonomy rows are one mathematical object: routing = block-sparsity in
  a lifted code (eq 2.2.5); the Bayes-optimal mixture denoiser is a softmax over subspace projections
  whose weights saturate to 0/1 when modes separate (eq 3.2.80); the book's canonical data model is a
  union of spheres in mutually orthogonal subspaces — a sample from component k has exactly-zero
  coordinates in the other K−1 subspaces. Routing sparsity is the architecture inheriting the
  mixture structure of the data.
- (extend, Ch5) Causal CRATE holds all three "when" regimes at once: design-time zeros (causal mask,
  input-independent), run-time zeros (ISTA threshold, per token), cache sparsity (KV cache as cached
  subspace projections — "also known as the so-called 'KV cache'"). One objective, three sparsity
  contracts, three different saved resources.
- (sharpen, Ch4) Water-filling is the cleanest unit/rule/when/resource instance: directions with
  variance above the water level get coded; below it, exactly zero rate. Plus the bookkeeping
  standard: a cluster structure is kept only if it pays for its own description (Huffman overhead
  included).
- (sharpen, Ch3) Zeros in the wrong unit are catastrophic: the empirical distribution is "a mixture
  of Gaussians with zero covariances" — maximal sparsity by entropy count, yet it stores every
  training point verbatim. The resource "saved" is negative.
- (extend, Ch9) Ma elevates update sparsity to necessity: future learning mechanisms "should be
  updatable through highly localized and sparse forward or backward optimization" — dense global
  backprop is an option nature cannot afford. LoRA/adapters as approximations of how nature is
  forced to learn.
- Three NEW taxonomy candidates beyond the essay's eight:
  - (Ch5, ToST) **direction sparsity** — suppress representation directions by second-moment
    statistics, no pairwise token similarities; changes the saved resource's *category*
    (quadratic→linear attention).
  - (Ch6, i-CTRL) **memory sparsity** — a zero as a *promise*: the constraint ΔR(Z_old, Ẑ_old)=0
    pins old memory while new classes train; resource saved = exemplar storage (means+covariances
    only).
  - (Ch8, ControlNet) **initialization zeros** — zero convolutions joining a frozen substrate to a
    trainable copy: provably a no-op at step 0, nonzero gradients after. The mask/scaffold language
    running in reverse: zeros to *add* a capability without disturbing the substrate.

## S3 — Meaningful zeros

- (extend, Ch2) **Zeros make features ontologically real.** PCA's loss is rotation-invariant, so
  individual dense directions are basis-relative fictions; "the sparse dictionary model is decidedly
  not invariant" — rotation destroys the zeros. In a dense representation there is no fact of the
  matter about which units carry a capability; intervention claims are only coherent where sparsity
  has broken the symmetry. Zeros aren't just savings — they're what make the substrate a real object.
- (extend, Ch2) Isolation is a conditional guarantee: SAEs are LISTA with L=1 on the LASSO objective;
  sparse recovery succeeds iff the dictionary is incoherent and is NP-hard in the worst case. SAE
  failure modes (splitting, absorption, dead latents) are classical sparse-recovery failures under
  coherent dictionaries — a theory of when "going dark" is achievable.
- (extend, Ch4) Capabilities-as-classes under MCR² → mutually orthogonal subspaces, exact zeros at
  the optimum (Thm 4.2: Z_k*ᵀZ_l* = 0), provided ambient width d ≥ Σd_k. The width condition
  predicts when isolation fails — superposition as insufficient ambient dimension. Plus reachability
  (Thms 4.3–4.4): orthogonal configurations are almost-sure endpoints of gradient descent, all other
  critical points strict saddles.
- (extend, Ch4) **Phase transition, not slope:** meaningful zeros exist only inside the
  generalization regime (lazy / generalization / memorization, dialed by ε). Falsifiable PRISM
  prediction: sweep zeroing aggressiveness, look for a cliff.
- (extend, Ch3) The contract needs an explicit ε: exact entropy minimization is degenerate (the
  memorizing denoiser is the global optimum of the diffusion loss), so "behavior survives" must mean
  survives-within-ε. A sparsity claim that omits its tolerance is ill-posed. Also S3's
  intervention-over-attribution stance has precedent: memorization vs generalization in diffusion is
  settled behaviorally (sample and test), never by reading the objective.
- (extend, Ch5) Attention sparsity with a recovery *theorem*: hard-threshold the softmax at τ and
  SNR improves at linear rate (1+ητ) per layer, under stated conditions (Thm 5.1). Zeroing small
  attention entries isn't merely survivable — it's what makes the representation improve. The
  strongest known form of a meaningful-zero contract.
- (extend, Ch7) **The converse / negative result:** components of x in the null space of the
  measurement operator "can never be recovered from observations," no matter how good the prior.
  Recoverable is a property of the pair (mask, manifold), not of sparsity level alone.
- (extend, Ch7) Exactly-solvable capability sparsity: the class-conditional denoiser is the rank-P
  projector U_yU_yᵀ (eq 7.4.18) — the behavior IS a low-rank projector, the substrate IS a subspace,
  routing IS a softmax zeroing other subspaces, selectable by a token (Example 7.6). PRISM = asking
  how far real networks deviate from this solvable case.
- (extend, Ch7) **Classifier-free guidance is a capability ablation run in production:** train with a
  null token (capability OFF), sample by running ON and OFF branches and amplifying the difference
  with negative weight on OFF. Every Stable Diffusion image pays for an ablation contrast twice per
  step. Ablation isn't just analysis — it's a computational primitive.
- (extend, Ch8) Attention-only transformers: delete every MLP from GPT-2 and language modeling
  survives (AoT-MHSA Base 4.42 vs GPT-2 4.32 LAMBADA val loss; MLPs mainly buy training speed;
  recovery condition: more depth). A published whole-component-class instance of the S3 contract.
- (extend, Ch8) Substrates can be *manufactured*, not just found: CRATE trained only on
  classification develops attention heads that segment per-concept ("the first machine learning
  system to do this"), while an identically trained ViT scores ~zero (AP50 0.1 vs 2.9). The sparse
  coding operator — not scale or data — buys the separable substrate. White-box design turns
  mask/scaffold/substrate from a finding into a specification (substrate = named subspace U_k).
- (extend, Ch6) i-CTRL: orthogonal class memories with a no-interference guarantee — off-block-
  diagonal of |ZᵀZ| is zero; edit one class's subspace, others provably untouched; old memory pinned
  by ΔR=0 through the loop. The PRISM contract avant la lettre, at class-memory granularity.
- (sharpen, Ch6) One-directional checks are provably insufficient: f∘g can be identity on the feature
  subspace while g∘f throws data off its manifold — only the full closed loop certifies. The exact
  analogue of "attribution is not recovery."
- (extend, Ch9) Ma's Wiener/Turing/Popper tests: "is there any difference between memorizing and
  understanding?" — the ablation test answers it: a zeroed component was load-bearing
  (understanding) or incidental (memorized statistics).

## SERIES — seeds for later essays

- One operation underneath everything: completion (masked AE), denoising (diffusion), sparse coding
  are all projection onto the low-dimensional support, solved by variants of generalized power
  methods (Ch2, Table 2.1). The learned observer is a learned projection operator; surprise is the
  projection residual.
- Zeros as equilibria, not penalties (Ch6): sparsity emerges where expansive encoding and compressive
  decoding balance in a minimax game. Prediction: equilibrium zeros are stable under retraining;
  regularizer zeros heal differently. A diagnostic for meaningful vs imposed zeros.
- Diffusion and denoising are entropy mirror images governed by the same Fisher information (A2):
  dh/dt = t·J(p_t) under noising; the same J bounds the entropy drop under denoising. Where the
  denoiser's quadratic form degenerates to zero, the data is exactly low-dimensional — zeros in the
  Jacobian are the signature of the sliver.
- Recovery has a step schedule (A2): viable denoising steps shrink like t⁷/R⁴ near the manifold —
  coarse identity is cheap, fine detail is expensive. "Determined" details are free in bits, not in
  steps.
- Ma's closing thesis (Ch9, verbatim): "open-ended models are for a closed world, however large;
  closed-loop systems are for an open world, however small." Small is a feature — direct backing for
  capability-in-a-small-substrate as the meaningful object.
- Cortical conjecture (Ch9): intelligence as tens of thousands of near-identical, sparsely
  interconnected closed-loop autoencoder modules; sparse interconnection is the structural
  precondition of separability. PRISM's modularity as the architecture nature uses.

## Figures worth viewing

- Ch2 `faces.png` — aligned faces span ~20 dims of 784-dim pixel space; the sliver made concrete.
- Ch4 `Two-subspaces.png`, `mcr_diagram.png` — pay-only-for-the-sliver and MCR² in one image each.
- Ch4 `neural_collapse.png` — the canonical picture of zeros that destroy information.
- Ch5 `coding-transform.png` — why compression alone cannot make zeros (rotation invariance).
- Ch5 `crate_encoder_architecture.png` — transformer layer as compress-then-sparsify.
- Ch6 `Heatmap_MNIST.jpg` — block-diagonal |ZᵀZ|: the off-diagonal zeros ARE capability isolation.
- Ch7 `masked-checkerboard.png` — matrix completion triptych: mask, corruption, exact recovery.
- Ch7 `ambient_diffusion.png` — sharp recovery at 80% masked: sampling vs conditional mean.
- Ch8 `crate_semantic_heads.png` — emergent per-concept segmenting heads (and the ViT negative).
- Ch9 `loops.png` — hierarchy of sparsely interconnected closed-loop modules.
- All under https://ma-lab-berkeley.github.io/deep-representation-learning-book/

## Epiplexity addendum (Finzi, Qiu, Jiang, Izmailov, Kolter, Wilson — arXiv 2601.03220, read 2026-06-10)

Core objects: for a compute budget T, the program P* minimizing time-bounded two-part MDL
(|P| + E[log 1/P(X)]) splits information into **epiplexity** S_T(X)=|P*| (structure a T-bounded
observer can extract) and **time-bounded entropy** H_T(X) (what remains noise at budget T).
Measured in practice: prequential — epiplexity ≈ area under the training loss curve above final
loss; requential — cumulative KL(teacher‖student), rigorous, 2–10× slower.

Key results:
- CSPRNG outputs: near-maximal H_T, near-zero S_T (Thm 9) — random to every poly-time observer
  despite a one-line generator. High-epiplexity variables exist under one-way functions (Thm 10).
- Paradox 1 resolved: deterministic computation CAN create time-bounded information (ECA rule 15 =
  little of either; rule 30 = pure H_T; rule 54 = high S_T). Synthetic-data rule: avoid transforms
  with cheap inverses.
- Paradox 2: factorization order changes information (OWF: H_poly(X|Y)+H_poly(Y) exceeds the other
  order by ω(log n); no poly-time model of an OWF's forward direction can satisfy Bayes). Chess:
  board-then-moves ordering → higher epiplexity AND better OOD transfer (centipawn task).
- Paradox 3: bounded likelihood modeling learns MORE than the generating process — induction
  (hidden bits force 2^h candidate elimination; induction heads never in the generator) and
  emergence (Def 14; rule 54: epiplexity rises with compute, then COLLAPSES at the threshold where
  brute-force simulation becomes affordable — circuits are artifacts of the compute regime).
- OOD: loss measures only H_T (residual unpredictability); epiplexity measures reusable structure
  (circuit reuse). Text ≫ chess ≫ images (CIFAR >99% random); VQ tokenization raises image
  epiplexity; ADO data selection ≈ epiplexity maximization. Caveat: epiplexity is amount, not
  task-relevance.

Cross-map with the Ma book:
- Same move, different resource: Ma bounds precision (lossy ε), Finzi bounds compute (T). Both
  unbounded versions are degenerate (h = −∞ / memorizing denoiser ↔ Chaitin-trivial
  sophistication); structure only becomes measurable after declaring a budget. The S3 contract
  gains a second dial: survives-within-ε *at budget T*.
- "Determined" must become "determined AND cheaply determined": rule 30 / CSPRNGs have K(x) tiny
  yet are noise to all bounded observers — low-dimensionality (Ma) is necessary but not
  sufficient; the sliver must not be one-way. Matrix completion is benign (poly-time nuclear
  norm); in general inversion isn't.
- Memorizing vs understanding (Ma Ch9's open question) gets a candidate formalization: H_T bits =
  memorized residual, S_T bits = understood structure.
- Ma's closed loop is an epiplexity pump: AlphaZero/self-play shows deterministic loops create
  time-bounded structure; Finzi explains *what* the loop manufactures.
- The silhouette quiz is the hard (inverse) direction of an easy forward map (creature→outline is
  cheap masking; outline→creature needs structure) — same asymmetry as chess orderings and the
  murder-mystery induction. The show was accidentally a well-designed curriculum.
- Loss-curve reading of the essay: the structure the kid carries = area under his learning curve —
  surprise paid during training, amortized at inference ("every Saturday morning had already paid"
  is literally the prequential estimator).

## Verified quote bank (selected)

- "In theory, the static could resolve to a natural image on any given frame, but even if you spend a
  thousand years looking at the TV screen, it will not." (Ch2)
- "the soft-thresholding operator is like a 'signed' ReLU activation" (Ch2)
- "Our optimal denoiser is a (rescaled) linear projection onto the low-rank subspace supporting our
  data distribution." (Ch3)
- "This functional form is similar to an attention mechanism in a transformer architecture!" (Ch3)
- "for generative diffusion models, scaling the model is not all you need!" (Ch3)
- "To learn the best representation, we require that the whole is maximally greater than the sum of
  its parts" (Ch4)
- "The exception is the last layer's sparsity, since dense features are important for prediction." (Ch5)
- "Natural intelligent beings... simply cannot afford such a brute-force solution for learning" (Ch6)
- "when the distribution of X is low-dimensional... if a sufficient part of X is observed, it fully
  determines X and hence the missing part X_m." (Ch7)
- "In particular, there are components of x in the null space/kernel of A that can never be recovered
  from observations." (Ch7)
- "This means that information about each patch is stored in other patches." (Ch8)
- "In practice, only a few of these tokens are really needed for each prediction task." (Ch8)
- "do we really need the MLP inside a transformer, and how good can the performance get without it?" (Ch8)
- "open-ended models are for a closed world, however large; closed-loop systems are for an open
  world, however small." (Ch9)
- "All cortical columns have similar physical structures and functions. They are highly parallel and
  distributed, though sparsely interconnected." (Ch9)
