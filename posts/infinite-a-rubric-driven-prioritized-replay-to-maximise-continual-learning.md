---
title: infinite - a rubric driven prioritized replay to maximise continual learning
date: 2025-01-07
excerpt: a reinforcement learning replay mechanism that uses rubric-based prioritization to optimize continual learning through evaluation and adaptive curriculum design
---

> "an infinite game is played for the purpose of continuing the play. not for winning or achieving a specific end." — James P. Carse

## abstract

continual learning systems face a fundamental challenge: how to efficiently retain and build upon previously learned knowledge while adapting to new information. traditional training methods often suffer from catastrophic forgetting and inefficient resource utilization.

infinite introduces a **rubric-driven prioritized replay mechanism** that transforms how continual learning systems select, prioritize, and replay experiences. by implementing a diverse and adaptive evaluation framework, infinite aims to ensure that the most educationally valuable experiences are replayed with optimal frequency. this is a reinforcement learning agent that tries to maximise the ability to learn continuously from experience without diving into any architecture level changes.

---

## understanding infinite replay

imagine you're training an AI system to master multiple domains. these domains are not necessarily related to each other. they may also vary in complexity. you want to have a single base model that can learn from all of these domains. but also it should be able to learn from new domains as they come in. currently we don't have anything that tackles this effectively. my question is: how do we do this with what we already have?

there are many approaches to this problem. most of them being architecture level changes. i want to explore the possibility of doing this with the assumption that it is already possible given the right training methodology.

## the intuition

the idea of designing this borrows it from the mechanism of spaced repetition. the idea is that you want to replay the most important experiences with the highest frequency. but you also want to replay the least important experiences with the lowest frequency. 

if we can do the following:
* measuring the scores across the domains (rubrics)
* detecting drift in the scores (value functions per domain)
* replaying the areas that are slipping more often than what's stable

then we can have a system that is able to learn from new domains and maintain the knowledge of the old domains.

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

* collecting the data/prompts
* preparing rubrics
* create evals with strategies like mixeval
* detect forgetting
* replay mechanism and best priors to use as design principles
  
anything else?