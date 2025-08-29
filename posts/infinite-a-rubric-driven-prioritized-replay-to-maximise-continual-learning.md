---
title: infinite - a rubric driven prioritized replay to maximise continual learning
date: 2025-08-20
excerpt: a reinforcement learning replay mechanism that uses rubric-based prioritization to optimize continual learning through evaluation and adaptive curriculum design
---

> "an infinite game is played for the purpose of continuing the play. not for winning or achieving a specific end." — James P. Carse

## abstract

continual learning systems face a fundamental challenge: how to efficiently retain and build upon previously learned knowledge while adapting to new information. traditional training methods often suffer from catastrophic forgetting and inefficient resource utilization.

infinite introduces a **rubric-driven prioritized replay mechanism** that transforms how continual learning systems select, prioritize, and replay experiences. by implementing a diverse and adaptive evaluation framework, infinite aims to ensure that the most educationally valuable experiences are replayed with optimal frequency.

**key innovations:**
- **curriculum-based domain selection**: dynamically prioritizes training domains based on performance bands (low/medium/high) and staleness metrics
- **on-policy training with fresh rollouts**: maintains policy freshness without storing old trajectories, using distributed state tracking across domains
- **contamination detection**: pre-training validation ensures evaluation data hasn't leaked into training sets
- **upgrade mode**: enhances post-trained models with new capabilities while preserving prior skills via KL anchoring
- **mixed/single batch alternation**: alternates between focused single-domain and cross-domain mixed batches for optimal generalization

this approach addresses both (1) minimizing forgetfulness across multiple domains over long horizons, and (2) upgrading post-trained models when original training data is unavailable.

---

## understanding infinite replay

imagine you're training an AI system to master multiple domains. these domains are not necessarily related to each other. they may also vary in complexity. you want to have a single base model that can learn from all of these domains. but also it should be able to learn from new domains as they come in. currently we don't have anything that tackles this effectively. my question is: how do we do this with what we already have?

there are many approaches to this problem. most of them being architecture level changes. i want to explore the possibility of doing this with the assumption that it is already possible given the right training methodology.

## the intuition

the idea borrows from spaced repetition mechanisms - replay the most important experiences with highest frequency while maintaining minimal coverage of stable areas.

**concrete mechanisms:**

**performance band assignment:**
- convert rubric grades (1-4 scale) to pass/fail indicators (pass ≥ 3)
- track exponential moving average (EMA) of pass rates per domain
- assign performance bands: low (<0.4), medium (0.4-0.8), high (>0.8)

**adaptive scheduling priorities:**
- low performers: 60% of training capacity (frequent practice)
- medium performers: 30% capacity (regular practice)  
- high performers: 10% capacity (occasional refresh)
- staleness boost: domains not seen recently get priority increase
- uncertainty factor: high variance in recent grades indicates exploration value

**anti-forgetting feedback loop:**
```
domain performance drops → low band assignment → increased sampling priority → 
more training → performance recovery → higher band → reduced sampling
```

**distributed state tracking:**
each domain maintains: `acc_ema`, `performance_band`, `last_seen_step`, `grade_uncertainty`

this creates a self-regulating system where struggling domains automatically receive more attention while stable domains are maintained with minimal overhead.

## visual flow

```
INFINITE: Rubric-Driven Prioritized Replay for Continual Learning
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────┐
│              INPUT DOMAINS              │
│                                         │
│  ┌─────────────┐ ┌─────────────┐        │
│  │   Domain 1  │ │   Domain 2  │        │
│  │   (Math)    │ │  (Language) │        │
│  └─────────────┘ └─────────────┘        │
│                                         │
│  ┌─────────────┐ ┌─────────────┐        │
│  │   Domain 3  │ │   Domain N  │        │
│  │  (Science)  │ │  (New Task) │        │
│  └─────────────┘ └─────────────┘        │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         RUBRIC EVALUATION MODULE       │
│                                         │
│  ├─ Performance Assessment              │
│  ├─ Cross-Domain Scoring                │
│  └─ Task-Specific Metrics              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│       SCORE DRIFT DETECTION MODULE     │
│                                         │
│  ├─ Value Function Tracking             │
│  ├─ Performance Change Analysis         │
│  └─ Forgetting Detection Algorithm      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      PRIORITIZED REPLAY SCHEDULER      │
│                                         │
│  ├─ Adaptive Curriculum Generation      │
│  ├─ Spaced Repetition Algorithm         │
│  └─ Priority Queue Management          │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           REPLAY EXECUTION             │
│                                         │
│  ├─ High Priority: Slipping Domains     │
│  ├─ Medium Priority: New Learning       │
│  └─ Low Priority: Stable Domains       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            CONTINUAL LEARNING           │
│             OBJECTIVES                  │
│                                         │
│  ✓ Knowledge Retention                  │
│  ✓ New Domain Acquisition               │
│  ✓ Catastrophic Forgetting Prevention   │
│  ✓ Adaptive Learning Rate               │
└─────────────────────────────────────────┘

PROCESS FLOW: Domains → Evaluation → Detection → Scheduling → Execution → Learning
```

## contamination detection and data integrity

before any training begins, infinite implements comprehensive contamination detection to ensure evaluation data hasn't leaked into training sets:

**pre-training validation protocol:**
- sample representative subsets from each training domain
- compute semantic similarity (cosine similarity of embeddings) between training and evaluation prompts
- flag matches exceeding configurable threshold (default: 0.95 cosine similarity)
- generate detailed contamination audit report with exact matches and near-duplicates
- either automatically remove contaminated samples or halt with error if contamination exceeds tolerance
- persist contamination logs for reproducibility and compliance

**why this matters:** contaminated evaluation data leads to inflated performance metrics and false confidence in model capabilities. this validation step ensures legitimate measurement of continual learning progress.

## implementation architecture

**core training loop (every step k):**

1. **domain state tracking**
   - maintain domain statistics (performance, staleness, uncertainty)
   - synchronize across training nodes when distributed

2. **domain health assessment**
   - calculate performance bands from acc_ema thresholds
   - compute staleness (steps since domain last trained)
   - measure uncertainty from recent grade variance

3. **batch composition strategy**
   - every 10th step: single-domain batch (focused learning)
   - other steps: mixed-domain batch (cross-domain transfer)
   - research suggests 12% better generalization from alternation

4. **priority-driven domain selection**
   ```python
   priority = band_weight + staleness_factor + uncertainty_factor + base_weight
   domain_shares = softmax(priorities + anti_starvation_epsilon)
   ```

5. **rollout execution and grading**
   - generate model responses for selected prompts
   - evaluate using domain-specific rubrics (1-4 scale)
   - update acc_ema with pass/fail indicators

6. **GRPO gradient updates** with KL regularization

**key components to build:**

- **InfiniteGRPOTrainer**: extends base GRPO with curriculum scheduling
- **TriageStateManager**: persistent distributed state storage  
- **ContaminationDetector**: pre-training validation (0.95 cosine similarity threshold)
- **TriageSampler**: priority calculation and batch assembly
- **RubricEvaluator**: 4-point grading framework

**domain state structure:**
```python
class TriageState:
    acc_ema: float           # exponential moving average of pass rates
    performance_band: str    # "low", "medium", "high" 
    last_seen_step: int      # staleness tracking
    grade_uncertainty: float # variance in recent rubric scores
```

## upgrade mode: enhancing post-trained models

upgrade mode addresses a critical real-world scenario: you have a well-trained model M0, but original training data is unavailable. you want to add new capabilities without losing existing skills.

**initialization workflow:**
1. **contamination check**: validate new training data doesn't overlap with evaluation suites
2. **baseline establishment**: evaluate frozen model M0 on all domain evaluation suites
3. **state initialization**: set initial acc_ema values for each domain based on M0's performance
4. **anchor setup**: configure KL divergence penalties toward M0 to prevent forgetting

**training modifications:**
- **conservative scheduling**: allocate 70% batch capacity to new domains, 30% to prior domain maintenance
- **stronger KL regularization**: apply higher penalties (coefficient ≥0.1) to maintain similarity to M0
- **anti-starvation guarantees**: ensure prior domains get minimum sampling even when performing well
- **gradual capability transfer**: start with lower learning rates on new domains

**safety mechanisms:**
- **regression monitoring**: track performance on prior domains at every evaluation
- **multi-tier alerts**: escalating responses when prior domain performance drops
- **automatic rollback**: return to previous checkpoint if regression exceeds thresholds
- **human-in-the-loop gating**: require manual review after repeated safety violations

## evaluation metrics and success criteria

**forgetting and retention tracking:**
- **backward transfer (BWT)**: performance change on earlier domains after learning new ones
- **forward transfer (FWT)**: zero-shot performance gains on unseen domains  
- **average accuracy (ACC)**: macro-average across all domains over time
- **area under retention curve (AURC)**: long-term stability per domain
- **time-to-decay**: steps before performance degrades without practice

**continual learning benchmarks:**
```python
# stability curves showing per-domain pass-rate EMA over training steps
stability_curve = acc_ema_per_domain_over_time

# compare against baselines
baseline_grpo = standard_grpo_without_scheduling
infinite_a1 = curriculum_domain_selection_only  
infinite_a2 = add_staleness_priority_boosting
infinite_a3 = add_uncertainty_factors
infinite_full = mixed_single_batch_alternation
```

**success criteria:**
- curriculum scheduling improves AURC by ≥25% over baseline GRPO
- mixed/single alternation shows measurable generalization benefit
- upgrade mode: new domain improvement ≥5 points, prior domain drop ≤1 point
- contamination detection catches known overlaps with 95%+ accuracy

**safety gating policy for upgrade mode:**
- first alert: increase domain bucket weight to boost sampling
- second alert: strengthen KL penalty toward baseline model M0  
- third alert: reduce new domain sampling temporarily
- final gate: halt training and require human review after H failed evaluations

## planning the details

we need to plan the details of the implementation.
* choice of base model?
* which domains to use?
* detecting catastrophic forgetting in standard RL training for the base model?
* what to measure for each domain?
* expected challenges with reward hacking?
* known works that tackle this or something similar?
* rough timeline?
* what people with various backgrounds can contribute?

## division by contribution areas

broadly there are six areas of contribution where there are lots of things to be done: 

* contamination check scripts - to test the base/instruct model on the domains we pick 
* collecting small datasets, evals, RL env for math/code/creative language tasks
* contributing to code based on already decided algorithms (scheduling the replay, how to weight the domains, any other policy gradient design decisions)
* contributing to improving the algorithms based on some identified disadvantage
* compute/running experiments
* miscellaneous (any software level, uncategorised feedback/improvement)

this is a work in progress.
all updates will be posted here.

reach out if you think it is cool and can contribute in any way - collaboration, compute or sponsorship.