---
title: infinite — A Rubric-Driven Prioritized Replay to Maximise Continual Learning
date: 2025-08-20
excerpt: A reinforcement-learning replay mechanism that uses rubric-based prioritization to optimize continual learning through evaluation and adaptive curriculum design.
tags: continual-learning, reinforcement-learning, evaluation
status: research
category: research
---

> "An infinite game is played for the purpose of continuing the play. Not for winning or achieving a specific end." — James P. Carse

## Abstract

Continual learning systems face a fundamental challenge: how to efficiently retain and build upon previously learned knowledge while adapting to new information. Traditional training methods often suffer from catastrophic forgetting and inefficient resource utilization.

infinite introduces a **rubric-driven prioritized replay mechanism** that transforms how continual learning systems select, prioritize, and replay experiences. By implementing a diverse and adaptive evaluation framework, infinite aims to ensure that the most educationally valuable experiences are replayed with optimal frequency.

**Key innovations:**
- **Curriculum-based domain selection**: dynamically prioritizes training domains based on performance bands (low/medium/high) and staleness metrics
- **On-policy training with fresh rollouts**: maintains policy freshness without storing old trajectories, using distributed state tracking across domains
- **Contamination detection**: pre-training validation ensures evaluation data hasn't leaked into training sets
- **Upgrade mode**: enhances post-trained models with new capabilities while preserving prior skills via KL anchoring
- **Mixed/single batch alternation**: alternates between focused single-domain and cross-domain mixed batches for optimal generalization

This approach addresses both (1) minimizing forgetfulness across multiple domains over long horizons, and (2) upgrading post-trained models when original training data is unavailable.

---

## Understanding infinite Replay

Imagine you're training an AI system to master multiple domains. These domains are not necessarily related to each other. They may also vary in complexity. You want to have a single base model that can learn from all of these domains. But also it should be able to learn from new domains as they come in. Currently we don't have anything that tackles this effectively. My question is: how do we do this with what we already have?

There are many approaches to this problem. Most of them being architecture level changes. I want to explore the possibility of doing this with the assumption that it is already possible given the right training methodology.

## The Intuition

The idea borrows from spaced repetition mechanisms - replay the most important experiences with highest frequency while maintaining minimal coverage of stable areas.

**Concrete mechanisms:**

**Performance band assignment:**
- Convert rubric grades (1-4 scale) to pass/fail indicators (pass ≥ 3)
- Track exponential moving average (EMA) of pass rates per domain
- Assign performance bands: low (<0.4), medium (0.4-0.8), high (>0.8)

**Adaptive scheduling priorities:**
- Low performers: 60% of training capacity (frequent practice)
- Medium performers: 30% capacity (regular practice)
- High performers: 10% capacity (occasional refresh)
- Staleness boost: domains not seen recently get priority increase
- Uncertainty factor: high variance in recent grades indicates exploration value

**Anti-forgetting feedback loop:**
```
domain performance drops → low band assignment → increased sampling priority →
more training → performance recovery → higher band → reduced sampling
```

**Distributed state tracking:**
each domain maintains: `acc_ema`, `performance_band`, `last_seen_step`, `grade_uncertainty`

This creates a self-regulating system where struggling domains automatically receive more attention while stable domains are maintained with minimal overhead.

## Visual Flow

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

## Contamination Detection and Data Integrity

Before any training begins, infinite implements comprehensive contamination detection to ensure evaluation data hasn't leaked into training sets:

**Pre-training validation protocol:**
- Sample representative subsets from each training domain
- Compute semantic similarity (cosine similarity of embeddings) between training and evaluation prompts
- Flag matches exceeding configurable threshold (default: 0.95 cosine similarity)
- Generate detailed contamination audit report with exact matches and near-duplicates
- Either automatically remove contaminated samples or halt with error if contamination exceeds tolerance
- Persist contamination logs for reproducibility and compliance

**Why this matters:** contaminated evaluation data leads to inflated performance metrics and false confidence in model capabilities. This validation step ensures legitimate measurement of continual learning progress.

## Implementation Architecture

**Core training loop (every step k):**

1. **Domain state tracking**
   - Maintain domain statistics (performance, staleness, uncertainty)
   - Synchronize across training nodes when distributed

2. **Domain health assessment**
   - Calculate performance bands from acc_ema thresholds
   - Compute staleness (steps since domain last trained)
   - Measure uncertainty from recent grade variance

3. **Batch composition strategy**
   - Every 10th step: single-domain batch (focused learning)
   - Other steps: mixed-domain batch (cross-domain transfer)
   - Research suggests 12% better generalization from alternation

4. **Priority-driven domain selection**
   ```python
   priority = band_weight + staleness_factor + uncertainty_factor + base_weight
   domain_shares = softmax(priorities + anti_starvation_epsilon)
   ```

5. **Rollout execution and grading**
   - Generate model responses for selected prompts
   - Evaluate using domain-specific rubrics (1-4 scale)
   - Update acc_ema with pass/fail indicators

6. **GRPO gradient updates** with KL regularization

**Key components to build:**

- **InfiniteGRPOTrainer**: extends base GRPO with curriculum scheduling
- **TriageStateManager**: persistent distributed state storage
- **ContaminationDetector**: pre-training validation (0.95 cosine similarity threshold)
- **TriageSampler**: priority calculation and batch assembly
- **RubricEvaluator**: 4-point grading framework

**Domain state structure:**
```python
class TriageState:
    acc_ema: float           # exponential moving average of pass rates
    performance_band: str    # "low", "medium", "high"
    last_seen_step: int      # staleness tracking
    grade_uncertainty: float # variance in recent rubric scores
```

## Upgrade Mode: Enhancing Post-trained Models

Upgrade mode addresses a critical real-world scenario: you have a well-trained model M0, but original training data is unavailable. You want to add new capabilities without losing existing skills.

**Initialization workflow:**
1. **Contamination check**: validate new training data doesn't overlap with evaluation suites
2. **Baseline establishment**: evaluate frozen model M0 on all domain evaluation suites
3. **State initialization**: set initial acc_ema values for each domain based on M0's performance
4. **Anchor setup**: configure KL divergence penalties toward M0 to prevent forgetting

**Training modifications:**
- **Conservative scheduling**: allocate 70% batch capacity to new domains, 30% to prior domain maintenance
- **Stronger KL regularization**: apply higher penalties (coefficient ≥0.1) to maintain similarity to M0
- **Anti-starvation guarantees**: ensure prior domains get minimum sampling even when performing well
- **Gradual capability transfer**: start with lower learning rates on new domains

**Safety mechanisms:**
- **Regression monitoring**: track performance on prior domains at every evaluation
- **Multi-tier alerts**: escalating responses when prior domain performance drops
- **Automatic rollback**: return to previous checkpoint if regression exceeds thresholds
- **Human-in-the-loop gating**: require manual review after repeated safety violations

## Evaluation Metrics and Success Criteria

**Forgetting and retention tracking:**
- **Backward transfer (BWT)**: performance change on earlier domains after learning new ones
- **Forward transfer (FWT)**: zero-shot performance gains on unseen domains
- **Average accuracy (ACC)**: macro-average across all domains over time
- **Area under retention curve (AURC)**: long-term stability per domain
- **Time-to-decay**: steps before performance degrades without practice

**Continual learning benchmarks:**
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

**Success criteria:**
- Curriculum scheduling improves AURC by ≥25% over baseline GRPO
- Mixed/single alternation shows measurable generalization benefit
- Upgrade mode: new domain improvement ≥5 points, prior domain drop ≤1 point
- Contamination detection catches known overlaps with 95%+ accuracy

**Safety gating policy for upgrade mode:**
- First alert: increase domain bucket weight to boost sampling
- Second alert: strengthen KL penalty toward baseline model M0
- Third alert: reduce new domain sampling temporarily
- Final gate: halt training and require human review after H failed evaluations

## Planning the Details

We need to plan the details of the implementation.
* Choice of base model?
* Which domains to use?
* Detecting catastrophic forgetting in standard RL training for the base model?
* What to measure for each domain?
* Expected challenges with reward hacking?
* Known works that tackle this or something similar?
* Rough timeline?
* What people with various backgrounds can contribute?

## Division by Contribution Areas

Broadly there are six areas of contribution where there are lots of things to be done:

* Contamination check scripts - to test the base/instruct model on the domains we pick
* Collecting small datasets, evals, RL env for math/code/creative language tasks
* Contributing to code based on already decided algorithms (scheduling the replay, how to weight the domains, any other policy gradient design decisions)
* Contributing to improving the algorithms based on some identified disadvantage
* Compute/running experiments
* Miscellaneous (any software level, uncategorised feedback/improvement)

This is a work in progress.
All updates will be posted here.

**Join the discussion:**
- [E/Xperiments Discord server](https://discord.gg/YaYfPu4ZT4)
- **GitHub Repo**: https://github.com/tokenbender/infinite

Reach out if you think it is cool and can contribute in any way - collaboration, compute or sponsorship.
